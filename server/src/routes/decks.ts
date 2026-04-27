import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { createDeckFromPath, getDeck, updateDeck, deleteNode, setLastStudied, saveDeckReview } from '../services/deck.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { enqueueExplanation } from '../services/scheduler.service.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const CSV_MAX_DATA_ROWS = 5000;

export const decksRouter = Router();

decksRouter.use(requireAuth);

decksRouter.post('/', async (req, res, next) => {
  try {
    const { path, topic, language, cardCount } = req.body;
    if (!path || !topic || !language) {
      throw new AppError(400, 'MISSING_FIELDS', 'path, topic, and language are required.');
    }
    const nodeId = await createDeckFromPath(req.userId!, path, topic, language, cardCount);

    enqueueExplanation(req.userId!, nodeId);

    res.status(201).json({ nodeId });
  } catch (e) { next(e); }
});

// ─── CSV Import ──────────────────────────────────────────────────────────────

interface CsvRow {
  deckName: string;
  topic: string;
  explanation: string;
  lineNumber: number;
  rawLine: string;
}

interface CsvSkip {
  lineNumber: number;
  rawLine: string;
  reason: string;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_\-]/g, '');
}

const HEADER_VARIANTS: Record<string, string[]> = {
  topic:       ['topic'],
  deckname:    ['deckname', 'name', 'deck'],
  explanation: ['explanation', 'description', 'details', 'notes'],
};

function matchHeader(field: string): string | null {
  const n = normalize(field);
  for (const [canonical, variants] of Object.entries(HEADER_VARIANTS)) {
    if (variants.includes(n)) return canonical;
  }
  return null;
}

function looksLikeHeader(fields: string[]): boolean {
  return fields.some(f => matchHeader(f) === 'topic');
}

function parseCsv(raw: string): { rows: CsvRow[]; skipped: CsvSkip[]; dataRowCount: number } {
  const allLines = raw.split(/\r?\n/);
  const lineEntries: Array<{ lineNumber: number; text: string }> = [];
  for (let i = 0; i < allLines.length; i++) {
    if (allLines[i].trim().length > 0) {
      lineEntries.push({ lineNumber: i + 1, text: allLines[i] });
    }
  }
  if (lineEntries.length === 0) return { rows: [], skipped: [], dataRowCount: 0 };

  const firstFields = lineEntries[0].text.split('\t');
  const hasHeader = looksLikeHeader(firstFields);

  let topicIdx = 1;
  let nameIdx = 0;
  let explIdx = 2;
  let dataStart = 0;

  if (hasHeader) {
    dataStart = 1;
    topicIdx = -1;
    nameIdx = -1;
    explIdx = -1;
    for (let i = 0; i < firstFields.length; i++) {
      const match = matchHeader(firstFields[i]);
      if (match === 'topic') topicIdx = i;
      else if (match === 'deckname') nameIdx = i;
      else if (match === 'explanation') explIdx = i;
    }
    if (topicIdx === -1) {
      throw new AppError(400, 'INVALID_CSV', 'Header row detected but no "Topic" column found.');
    }
  }

  const dataRowCount = lineEntries.length - dataStart;
  const rows: CsvRow[] = [];
  const skipped: CsvSkip[] = [];

  for (let i = dataStart; i < lineEntries.length; i++) {
    const { lineNumber, text } = lineEntries[i];
    const fields = text.split('\t');
    const unescape = (s: string) => s.replace(/\\n/g, '\n');
    const topic = unescape((fields[topicIdx] ?? '').trim());
    if (!topic) {
      skipped.push({ lineNumber, rawLine: text, reason: 'Missing topic' });
      continue;
    }
    const deckName = unescape((nameIdx >= 0 ? fields[nameIdx] ?? '' : '').trim() || topic);
    const explanation = unescape((explIdx >= 0 ? fields[explIdx] ?? '' : '').trim());
    rows.push({ deckName, topic, explanation, lineNumber, rawLine: text });
  }

  return { rows, skipped, dataRowCount };
}

decksRouter.post('/import-csv', upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) throw new AppError(400, 'MISSING_FILE', 'No CSV file uploaded.');

    const { language, cardCount: cardCountStr, collectionPath } = req.body;
    if (!language) throw new AppError(400, 'MISSING_FIELDS', 'language is required.');

    const cardCount = cardCountStr ? parseInt(cardCountStr, 10) : 10;
    const csvText = file.buffer.toString('utf-8');
    const { rows, skipped, dataRowCount } = parseCsv(csvText);

    if (dataRowCount > CSV_MAX_DATA_ROWS) {
      throw new AppError(400, 'CSV_TOO_LARGE', `File has ${dataRowCount} data rows, but the maximum is ${CSV_MAX_DATA_ROWS}.`);
    }

    const basePath = (collectionPath ?? '').trim();
    const userId = req.userId!;
    let createdCount = 0;
    let queuedCount = 0;
    const failures: Array<{ line: number; context: string; error: string }> = [];

    for (const skip of skipped) {
      failures.push({
        line: skip.lineNumber,
        context: skip.rawLine.length > 120 ? skip.rawLine.slice(0, 120) + '…' : skip.rawLine,
        error: skip.reason,
      });
    }

    for (const row of rows) {
      const deckPath = basePath ? `${basePath}::${row.deckName}` : row.deckName;
      const promptMaterial = row.explanation ? `${row.topic}\n\n${row.explanation}` : row.topic;

      try {
        const nodeId = await createDeckFromPath(userId, deckPath, promptMaterial, language, cardCount);
        createdCount++;
        enqueueExplanation(userId, nodeId);
        queuedCount++;
      } catch (e: any) {
        failures.push({
          line: row.lineNumber,
          context: row.deckName,
          error: e?.message ?? 'Unknown error',
        });
      }
    }

    const failedCount = failures.length;
    failures.sort((a, b) => a.line - b.line);

    res.status(201).json({ createdCount, queuedCount, failedCount, failures });
  } catch (e) { next(e); }
});

decksRouter.get('/:nodeId', async (req, res, next) => {
  try {
    const deck = await getDeck(req.userId!, req.params.nodeId);
    if (!deck) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deck not found.' } }); return; }
    res.json(deck);
  } catch (e) { next(e); }
});

decksRouter.patch('/:nodeId', async (req, res, next) => {
  try {
    const { name, topic, language, cardCount } = req.body;
    const result = await updateDeck(req.userId!, req.params.nodeId, { name, topic, language, cardCount });

    if (result.regenerateExplanation) {
      enqueueExplanation(req.userId!, req.params.nodeId);
    }

    res.json(result);
  } catch (e) { next(e); }
});

decksRouter.post('/:nodeId/generate-explanation', async (req, res, next) => {
  try {
    // Manual re-trigger — streams SSE back to client
    const { streamExplanation } = await import('../services/claude.service.js');
    await streamExplanation(req, res, req.userId!, req.params.nodeId);
  } catch (e) { next(e); }
});

decksRouter.post('/:nodeId/mark-studied', async (req, res, next) => {
  try {
    await setLastStudied(req.params.nodeId);
    res.json({ success: true });
  } catch (e) { next(e); }
});

decksRouter.post('/:nodeId/review', async (req, res, next) => {
  try {
    const { userStars, aiStars, aiRecap } = req.body;
    if (!userStars || aiStars === undefined || !aiRecap) {
      throw new AppError(400, 'MISSING_FIELDS', 'userStars, aiStars, and aiRecap are required.');
    }
    const stars = Math.max(1, Math.min(5, Math.round(Number(userStars)))) as 1 | 2 | 3 | 4 | 5;
    const result = await saveDeckReview(req.params.nodeId, stars, Number(aiStars), String(aiRecap));
    res.json(result);
  } catch (e) { next(e); }
});

decksRouter.delete('/:nodeId', async (req, res, next) => {
  try {
    await deleteNode(req.userId!, req.params.nodeId);
    res.json({ success: true });
  } catch (e) { next(e); }
});
