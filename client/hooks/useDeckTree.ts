import { useState, useEffect, useCallback, useRef } from 'react';
import { getTree } from '@/lib/api';
import type { TreeNode } from '@/lib/types';

export function useDeckTree(): { tree: TreeNode[]; loading: boolean; refresh: () => void } {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await getTree();
      setTree(result);
    } catch {
      // silently fail on poll errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Poll every 5s to pick up generating → ready transitions
    intervalRef.current = setInterval(refresh, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  return { tree, loading, refresh };
}
