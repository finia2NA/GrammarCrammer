import { type CSSProperties, type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

type Placement = 'auto' | 'above' | 'below';

interface UseWebPopoverOptions {
  fallbackHeight: number;
  maxWidth: number;
  placement?: Placement;
  closeDelay?: number;
}

export function useWebPopover({
  fallbackHeight,
  maxWidth,
  placement = 'auto',
  closeDelay = 140,
}: UseWebPopoverOptions) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [popoverMounted, setPopoverMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | null>(null);
  const [resolvedPlacement, setResolvedPlacement] = useState<Exclude<Placement, 'auto'>>('below');

  const closePopover = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setClosing(true);
    setOpen(false);
    closeTimerRef.current = setTimeout(() => {
      setPopoverMounted(false);
      setClosing(false);
      closeTimerRef.current = null;
    }, closeDelay);
  }, [closeDelay]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      closePopover();
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open, closePopover]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const updatePosition = useCallback(() => {
    if (!rootRef.current) return;

    const viewportPadding = 12;
    const gap = 8;
    const rect = rootRef.current.getBoundingClientRect();
    const pickerHeight = popoverRef.current?.offsetHeight ?? fallbackHeight;
    const pickerWidth = Math.min(maxWidth, window.innerWidth - viewportPadding * 2);
    const spaceAbove = rect.top - viewportPadding;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const resolvedPlacement = placement === 'auto'
      ? (spaceBelow < pickerHeight && spaceAbove > spaceBelow ? 'above' : 'below')
      : placement;
    setResolvedPlacement(resolvedPlacement);
    const rawTop = resolvedPlacement === 'above'
      ? rect.top - pickerHeight - gap
      : rect.bottom + gap;
    const maxTop = window.innerHeight - pickerHeight - viewportPadding;

    setPopoverStyle({
      position: 'fixed',
      zIndex: 10000,
      top: Math.max(viewportPadding, Math.min(rawTop, maxTop)),
      left: Math.max(
        viewportPadding,
        Math.min(rect.left + rect.width / 2 - pickerWidth / 2, window.innerWidth - pickerWidth - viewportPadding),
      ),
      width: pickerWidth,
    });
  }, [fallbackHeight, maxWidth, placement]);

  const openPopover = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setPopoverMounted(true);
    setClosing(false);
    setOpen(true);
  }, []);

  return {
    rootRef: rootRef as RefObject<HTMLDivElement | null>,
    popoverRef: popoverRef as RefObject<HTMLDivElement | null>,
    open,
    popoverMounted,
    closing,
    popoverStyle,
    resolvedPlacement,
    openPopover,
    closePopover,
    updatePosition,
  };
}

export function usePopoverLifecycle(
  open: boolean,
  updatePosition: () => void,
  deps: unknown[] = [],
) {
  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, updatePosition, ...deps]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);
}
