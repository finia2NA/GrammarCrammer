import { prisma } from '../lib/prisma.js';
import type { TreeNode, DeckData } from '../types/index.js';

function mapDeck(deck: {
  nodeId: string; topic: string; language: string;
  explanation: string | null; explanationStatus: string;
  cardCount: number; lastStudiedAt: Date | null;
}): DeckData {
  return {
    nodeId: deck.nodeId,
    topic: deck.topic,
    language: deck.language,
    explanation: deck.explanation,
    explanationStatus: deck.explanationStatus as DeckData['explanationStatus'],
    cardCount: deck.cardCount,
    lastStudiedAt: deck.lastStudiedAt?.toISOString() ?? null,
  };
}

function mapNode(node: {
  id: string; parentId: string | null; name: string; sortOrder: number;
  createdAt: Date; updatedAt: Date; deck: any | null;
}, children: TreeNode[] = []): TreeNode {
  return {
    id: node.id,
    parentId: node.parentId,
    name: node.name,
    sortOrder: node.sortOrder,
    createdAt: node.createdAt.toISOString(),
    updatedAt: node.updatedAt.toISOString(),
    deck: node.deck ? mapDeck(node.deck) : null,
    children,
  };
}

export async function getTree(userId: string): Promise<TreeNode[]> {
  const nodes = await prisma.node.findMany({
    where: { userId },
    include: { deck: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  const treeMap = new Map<string, TreeNode>();
  for (const n of nodes) {
    treeMap.set(n.id, mapNode(n));
  }

  const roots: TreeNode[] = [];
  for (const node of treeMap.values()) {
    if (node.parentId && treeMap.has(node.parentId)) {
      treeMap.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function getNode(userId: string, nodeId: string): Promise<TreeNode | null> {
  const node = await prisma.node.findFirst({
    where: { id: nodeId, userId },
    include: {
      deck: true,
      children: {
        include: { deck: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });

  if (!node) return null;

  return mapNode(node, node.children.map(c => mapNode(c)));
}

export async function getNodePath(userId: string, nodeId: string): Promise<string> {
  const parts: string[] = [];
  let currentId: string | null = nodeId;

  while (currentId) {
    const found: { name: string; parentId: string | null } | null = await prisma.node.findFirst({
      where: { id: currentId, userId },
      select: { name: true, parentId: true },
    });
    if (!found) break;
    parts.unshift(found.name);
    currentId = found.parentId;
  }

  return parts.join('::');
}

/** Iterative BFS to get all descendant deck IDs. */
export async function getDescendantDeckIds(userId: string, nodeId: string): Promise<string[]> {
  const deckIds: string[] = [];
  const queue = [nodeId];

  while (queue.length > 0) {
    const batch = queue.splice(0, queue.length);

    const nodes = await prisma.node.findMany({
      where: { id: { in: batch }, userId },
      include: { deck: true, children: { select: { id: true } } },
    });

    for (const node of nodes) {
      if (node.deck) deckIds.push(node.id);
      for (const child of node.children) {
        queue.push(child.id);
      }
    }
  }

  return deckIds;
}
