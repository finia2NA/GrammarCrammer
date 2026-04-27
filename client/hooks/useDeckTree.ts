import { useState, useEffect, useCallback, useRef } from 'react';
import { getTree } from '@/lib/api';
import type { TreeNode } from '@/lib/types';

export function useDeckTree(active: boolean): {
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

  const doFetch = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await getTree(signal);
      if (!signal?.aborted) setTree(result);
    } catch {
      console.error('Failed to fetch deck tree');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        if (manualRef.current) {
          manualRef.current = false;
          setRefreshing(false);
        }
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    manualRef.current = true;
    setRefreshing(true);
    await doFetch();
  }, [doFetch]);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    const controller = new AbortController();
    doFetch(controller.signal);
    intervalRef.current = setInterval(() => doFetch(controller.signal), 5000);
    return () => {
      controller.abort();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, doFetch]);

  return { tree, loading, refreshing, refresh };
}
