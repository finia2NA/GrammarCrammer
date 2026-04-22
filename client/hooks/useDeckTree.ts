import { useState, useEffect, useCallback, useRef } from 'react';
import { getTree } from '@/lib/api';
import type { TreeNode } from '@/lib/types';

export function useDeckTree(): {
  tree: TreeNode[];
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
} {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const manualRef = useRef(false);

  const doFetch = useCallback(async () => {
    try {
      const result = await getTree();
      setTree(result);
    } catch {
      // silently fail on poll errors
    } finally {
      setLoading(false);
      if (manualRef.current) {
        manualRef.current = false;
        setRefreshing(false);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    manualRef.current = true;
    setRefreshing(true);
    await doFetch();
  }, [doFetch]);

  useEffect(() => {
    doFetch();
    intervalRef.current = setInterval(doFetch, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [doFetch]);

  return { tree, loading, refreshing, refresh };
}
