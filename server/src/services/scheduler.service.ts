import { prisma } from '../lib/prisma.js';
import { generateDeckExplanation } from './claude.service.js';

const MAX_CONCURRENT_PER_USER = 5;

interface Job {
  userId: string;
  deckId: string;
}

const queues = new Map<string, Job[]>();
const running = new Map<string, Set<string>>();

function getQueue(userId: string): Job[] {
  let q = queues.get(userId);
  if (!q) {
    q = [];
    queues.set(userId, q);
  }
  return q;
}

function getRunning(userId: string): Set<string> {
  let s = running.get(userId);
  if (!s) {
    s = new Set();
    running.set(userId, s);
  }
  return s;
}

function drain(userId: string) {
  const q = getQueue(userId);
  const r = getRunning(userId);

  while (q.length > 0 && r.size < MAX_CONCURRENT_PER_USER) {
    const job = q.shift()!;
    if (r.has(job.deckId)) continue;
    r.add(job.deckId);

    generateDeckExplanation(job.userId, job.deckId)
      .catch(err => {
        console.error(`[scheduler] Explanation failed for deck ${job.deckId}:`, err);
      })
      .finally(() => {
        r.delete(job.deckId);
        drain(userId);
      });
  }

  if (q.length === 0) queues.delete(userId);
  if (r.size === 0) running.delete(userId);
}

export function enqueueExplanation(userId: string, deckId: string) {
  const r = getRunning(userId);
  if (r.has(deckId)) return;

  const q = getQueue(userId);
  if (q.some(j => j.deckId === deckId)) return;

  q.push({ userId, deckId });
  drain(userId);
}

export async function initScheduler() {
  const pendingDecks = await prisma.deck.findMany({
    where: { explanationStatus: 'pending' },
    select: { nodeId: true, node: { select: { userId: true } } },
  });

  for (const deck of pendingDecks) {
    enqueueExplanation(deck.node.userId, deck.nodeId);
  }

  if (pendingDecks.length > 0) {
    console.log(`[scheduler] Re-enqueued ${pendingDecks.length} pending explanation(s)`);
  }
}
