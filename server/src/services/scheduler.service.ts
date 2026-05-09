import { prisma } from '../lib/prisma.js';
import { generateDeckExplanation } from './claude.service.js';
import { setGrammarCaseError, setGrammarCaseGenerating, setGrammarCasePending, setGrammarCaseReady } from './deck.service.js';
import { ensureGrammarCasesForDeck, regenerateGrammarCasesForDeck } from './grammar-case.service.js';
import { initializeNotificationScheduling, startNotificationWorker } from './notification.service.js';
import type { AiAnalyticsContext } from './analytics.service.js';

const MAX_CONCURRENT_AI_JOBS = 5;

type JobType = 'explanation' | 'case-ensure' | 'case-regenerate';

interface Job {
  type: JobType;
  userId: string;
  deckId: string;
  analyticsContext?: AiAnalyticsContext;
}

const queue: Job[] = [];
const running = new Set<string>();

function jobKey(job: Pick<Job, 'type' | 'deckId'>): string {
  return `${job.type}:${job.deckId}`;
}

function isQueued(type: JobType, deckId: string): boolean {
  return queue.some(j => j.type === type && j.deckId === deckId);
}

function isCaseJob(type: JobType): boolean {
  return type === 'case-ensure' || type === 'case-regenerate';
}

function hasQueuedCaseJob(deckId: string): boolean {
  return queue.some(j => isCaseJob(j.type) && j.deckId === deckId);
}

function hasRunningCaseJob(deckId: string): boolean {
  return running.has(`case-ensure:${deckId}`) || running.has(`case-regenerate:${deckId}`);
}

function nextRunnableJobIndex(): number {
  return queue.findIndex(job => {
    if (running.has(jobKey(job))) return false;
    if (isCaseJob(job.type) && hasRunningCaseJob(job.deckId)) return false;
    return true;
  });
}

async function runJob(job: Job): Promise<void> {
  if (job.type === 'explanation') {
    await generateDeckExplanation(job.userId, job.deckId);
  } else if (job.type === 'case-regenerate') {
    await setGrammarCaseGenerating(job.deckId);
    try {
      await regenerateGrammarCasesForDeck(job.userId, job.deckId, job.analyticsContext);
      await setGrammarCaseReady(job.deckId);
    } catch (error) {
      await setGrammarCaseError(job.deckId);
      throw error;
    }
  } else {
    await setGrammarCaseGenerating(job.deckId);
    try {
      await ensureGrammarCasesForDeck(job.userId, job.deckId, job.analyticsContext);
      await setGrammarCaseReady(job.deckId);
    } catch (error) {
      await setGrammarCaseError(job.deckId);
      throw error;
    }
  }
}

function drain() {
  while (queue.length > 0 && running.size < MAX_CONCURRENT_AI_JOBS) {
    const index = nextRunnableJobIndex();
    if (index < 0) break;
    const job = queue.splice(index, 1)[0];
    const key = jobKey(job);
    running.add(key);

    runJob(job)
      .catch(err => {
        console.error(`[scheduler] ${job.type} failed for deck ${job.deckId}:`, err);
      })
      .finally(() => {
        running.delete(key);
        drain();
      });
  }
}

export function enqueueExplanation(userId: string, deckId: string) {
  enqueueJob({ type: 'explanation', userId, deckId });
}

function enqueueJob(job: Job) {
  const key = jobKey(job);
  if (running.has(key) || isQueued(job.type, job.deckId)) return;

  if (job.type === 'case-regenerate') {
    const queuedEnsureIndex = queue.findIndex(j => j.type === 'case-ensure' && j.deckId === job.deckId);
    if (queuedEnsureIndex >= 0) queue.splice(queuedEnsureIndex, 1);
  }

  queue.push(job);
  drain();
}

export async function enqueueGrammarCaseExtraction(
  userId: string,
  deckId: string,
  options: { force?: boolean; analyticsContext?: AiAnalyticsContext } = {},
): Promise<void> {
  const job: Job = {
    type: options.force ? 'case-regenerate' : 'case-ensure',
    userId,
    deckId,
    analyticsContext: options.analyticsContext,
  };

  if (job.type === 'case-ensure' && (hasQueuedCaseJob(deckId) || hasRunningCaseJob(deckId))) return;
  if (job.type === 'case-regenerate') {
    if (running.has(jobKey(job)) || isQueued(job.type, deckId)) return;
    const queuedEnsureIndex = queue.findIndex(j => j.type === 'case-ensure' && j.deckId === deckId);
    if (queuedEnsureIndex >= 0) queue.splice(queuedEnsureIndex, 1);
  }

  if (!hasRunningCaseJob(deckId)) {
    await setGrammarCasePending(deckId);
  }

  queue.push(job);
  drain();
}

export async function initScheduler() {
  const pendingDecks = await prisma.deck.findMany({
    where: { explanationStatus: { in: ['pending', 'generating'] } },
    select: { nodeId: true, node: { select: { userId: true } } },
  });

  for (const deck of pendingDecks) {
    enqueueExplanation(deck.node.userId, deck.nodeId);
  }

  if (pendingDecks.length > 0) {
    console.log(`[scheduler] Re-enqueued ${pendingDecks.length} pending explanation(s)`);
  }

  await initializeNotificationScheduling();
  startNotificationWorker();
}
