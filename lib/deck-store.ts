import { getDb } from './db';
import type { TreeNode, DeckData } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function now(): number {
  return Date.now();
}

// ─── Row types (raw SQL results) ──────────────────────────────────────────────

interface NodeRow {
  id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

interface DeckRow {
  node_id: string;
  topic: string;
  language: string;
  explanation: string | null;
  explanation_status: string;
  card_count: number;
  last_studied_at: number | null;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

/** Get the full tree of nodes with deck data. */
export async function getTree(): Promise<TreeNode[]> {
  const db = await getDb();

  const nodes = await db.getAllAsync<NodeRow>(
    'SELECT * FROM nodes ORDER BY sort_order, created_at',
  );
  const decks = await db.getAllAsync<DeckRow>('SELECT * FROM decks');

  const deckMap = new Map<string, DeckRow>();
  for (const d of decks) deckMap.set(d.node_id, d);

  const treeNodes = new Map<string, TreeNode>();
  for (const n of nodes) {
    treeNodes.set(n.id, {
      id: n.id,
      parentId: n.parent_id,
      name: n.name,
      sortOrder: n.sort_order,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
      deck: deckMap.has(n.id) ? mapDeckRow(deckMap.get(n.id)!) : null,
      children: [],
    });
  }

  const roots: TreeNode[] = [];
  for (const node of treeNodes.values()) {
    if (node.parentId && treeNodes.has(node.parentId)) {
      treeNodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** Get a single node with its deck data. */
export async function getNode(id: string): Promise<TreeNode | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<NodeRow>('SELECT * FROM nodes WHERE id = ?', id);
  if (!row) return null;

  const deckRow = await db.getFirstAsync<DeckRow>('SELECT * FROM decks WHERE node_id = ?', id);
  const children = await db.getAllAsync<NodeRow>(
    'SELECT * FROM nodes WHERE parent_id = ? ORDER BY sort_order, created_at', id,
  );

  const childDecks = await db.getAllAsync<DeckRow>(
    `SELECT * FROM decks WHERE node_id IN (${children.map(() => '?').join(',')})`,
    ...children.map(c => c.id),
  );
  const childDeckMap = new Map<string, DeckRow>();
  for (const d of childDecks) childDeckMap.set(d.node_id, d);

  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deck: deckRow ? mapDeckRow(deckRow) : null,
    children: children.map(c => ({
      id: c.id,
      parentId: c.parent_id,
      name: c.name,
      sortOrder: c.sort_order,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      deck: childDeckMap.has(c.id) ? mapDeckRow(childDeckMap.get(c.id)!) : null,
      children: [],
    })),
  };
}

/** Get all descendant deck node IDs under a given node. */
export async function getDescendantDeckIds(nodeId: string): Promise<string[]> {
  const db = await getDb();

  // Use a recursive CTE to find all descendants
  const rows = await db.getAllAsync<{ node_id: string }>(
    `WITH RECURSIVE descendants(id) AS (
       SELECT id FROM nodes WHERE id = ?
       UNION ALL
       SELECT n.id FROM nodes n JOIN descendants d ON n.parent_id = d.id
     )
     SELECT d.node_id FROM decks d
     JOIN descendants desc ON d.node_id = desc.id`,
    nodeId,
  );

  return rows.map(r => r.node_id);
}

/** Get deck data for a specific deck. */
export async function getDeck(nodeId: string): Promise<DeckData | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<DeckRow>('SELECT * FROM decks WHERE node_id = ?', nodeId);
  return row ? mapDeckRow(row) : null;
}

// ─── Writes ───────────────────────────────────────────────────────────────────

/**
 * Create a deck from a path string (e.g. "JP::N5::Te-form").
 * Creates intermediate collection nodes as needed.
 * Returns the new deck's node ID.
 */
export async function createDeckFromPath(
  path: string,
  topic: string,
  language: string,
  cardCount = 10,
): Promise<string> {
  const db = await getDb();
  const segments = path.split('::').map(s => s.trim()).filter(Boolean);
  if (segments.length === 0) throw new Error('Path cannot be empty');

  const ts = now();
  let parentId: string | null = null;

  // Walk/create collection nodes for all segments except the last
  for (let i = 0; i < segments.length - 1; i++) {
    const name = segments[i];
    const existing = await findChildByName(db, parentId, name);

    if (existing) {
      parentId = existing.id;
    } else {
      const id = uuid();
      const nextOrder = await getNextSortOrder(db, parentId);
      await db.runAsync(
        'INSERT INTO nodes (id, parent_id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        id, parentId, name, nextOrder, ts, ts,
      );
      parentId = id;
    }
  }

  // Create the deck node (last segment)
  const deckName = segments[segments.length - 1];
  const deckId = uuid();
  const nextOrder = await getNextSortOrder(db, parentId);

  await db.runAsync(
    'INSERT INTO nodes (id, parent_id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    deckId, parentId, deckName, nextOrder, ts, ts,
  );
  await db.runAsync(
    'INSERT INTO decks (node_id, topic, language, card_count) VALUES (?, ?, ?, ?)',
    deckId, topic, language, cardCount,
  );

  return deckId;
}

/**
 * Update deck metadata. If topic or language changed, resets explanation_status to 'pending'.
 * Returns whether the explanation needs to be regenerated.
 */
export async function updateDeck(
  nodeId: string,
  updates: { name?: string; topic?: string; language?: string; cardCount?: number },
): Promise<{ regenerateExplanation: boolean }> {
  const db = await getDb();
  const ts = now();
  let regenerate = false;

  const current = await db.getFirstAsync<DeckRow>('SELECT * FROM decks WHERE node_id = ?', nodeId);
  if (!current) throw new Error(`Deck ${nodeId} not found`);

  if (updates.name !== undefined) {
    await db.runAsync(
      'UPDATE nodes SET name = ?, updated_at = ? WHERE id = ?',
      updates.name, ts, nodeId,
    );
  }

  if (updates.topic !== undefined || updates.language !== undefined || updates.cardCount !== undefined) {
    const topic = updates.topic ?? current.topic;
    const language = updates.language ?? current.language;
    const cardCount = updates.cardCount ?? current.card_count;
    regenerate = topic !== current.topic || language !== current.language;

    await db.runAsync(
      `UPDATE decks SET topic = ?, language = ?, card_count = ?${regenerate ? ", explanation_status = 'pending', explanation = NULL" : ''}, node_id = node_id WHERE node_id = ?`,
      topic, language, cardCount, nodeId,
    );

    await db.runAsync('UPDATE nodes SET updated_at = ? WHERE id = ?', ts, nodeId);
  }

  return { regenerateExplanation: regenerate };
}

/** Rename a collection node. */
export async function renameCollection(nodeId: string, newName: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE nodes SET name = ?, updated_at = ? WHERE id = ?',
    newName, now(), nodeId,
  );
}

/** Delete a node and all its descendants (CASCADE handles children). */
export async function deleteNode(nodeId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM nodes WHERE id = ?', nodeId);
}

/** Mark explanation as successfully generated. */
export async function setExplanation(nodeId: string, explanation: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE decks SET explanation = ?, explanation_status = 'ready' WHERE node_id = ?",
    explanation, nodeId,
  );
  await db.runAsync('UPDATE nodes SET updated_at = ? WHERE id = ?', now(), nodeId);
}

/** Mark explanation generation as failed. */
export async function setExplanationError(nodeId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE decks SET explanation_status = 'error' WHERE node_id = ?",
    nodeId,
  );
}

/** Mark explanation as currently generating. */
export async function setExplanationGenerating(nodeId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE decks SET explanation_status = 'generating' WHERE node_id = ?",
    nodeId,
  );
}

/** Record that a deck was studied. */
export async function setLastStudied(nodeId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE decks SET last_studied_at = ? WHERE node_id = ?',
    now(), nodeId,
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
    key, value, value,
  );
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function findChildByName(
  db: Awaited<ReturnType<typeof getDb>>,
  parentId: string | null,
  name: string,
): Promise<NodeRow | null> {
  if (parentId === null) {
    return db.getFirstAsync<NodeRow>(
      'SELECT * FROM nodes WHERE parent_id IS NULL AND name = ?', name,
    );
  }
  return db.getFirstAsync<NodeRow>(
    'SELECT * FROM nodes WHERE parent_id = ? AND name = ?', parentId, name,
  );
}

async function getNextSortOrder(
  db: Awaited<ReturnType<typeof getDb>>,
  parentId: string | null,
): Promise<number> {
  const row = parentId === null
    ? await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) as m FROM nodes WHERE parent_id IS NULL')
    : await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) as m FROM nodes WHERE parent_id = ?', parentId);
  return (row?.m ?? -1) + 1;
}

function mapDeckRow(row: DeckRow): DeckData {
  return {
    nodeId: row.node_id,
    topic: row.topic,
    language: row.language,
    explanation: row.explanation,
    explanationStatus: row.explanation_status as DeckData['explanationStatus'],
    cardCount: row.card_count,
    lastStudiedAt: row.last_studied_at,
  };
}
