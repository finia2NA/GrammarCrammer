import { useState, useEffect, useCallback } from 'react';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { getTree } from '@/lib/deck-store';
import type { TreeNode } from '@/lib/types';

export function useDeckTree(): { tree: TreeNode[]; loading: boolean; refresh: () => void } {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await getTree();
    setTree(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const subscription = addDatabaseChangeListener((event) => {
      if (event.tableName === 'nodes' || event.tableName === 'decks') {
        refresh();
      }
    });

    return () => subscription.remove();
  }, [refresh]);

  return { tree, loading, refresh };
}
