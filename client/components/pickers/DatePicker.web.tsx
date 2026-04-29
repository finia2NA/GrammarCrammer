import { type CSSProperties, type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
// react-dom is present for web builds, but this app does not currently install @types/react-dom.
// @ts-ignore
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { Icon } from '@/components/Icon';
import { useColors } from '@/constants/theme';
import { formatLocalDateToYmd, formatYmdForDisplay, parseYmd } from './dateUtils';
import 'react-day-picker/style.css';

type DatePickerPlacement = 'auto' | 'above' | 'below';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  popoverPlacement?: DatePickerPlacement;
  popoverTitle?: string;
  popoverFooter?: ReactNode;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick date',
  disabled = false,
  popoverPlacement = 'auto',
  popoverTitle = 'Select Date',
  popoverFooter,
}: DatePickerProps) {
  const colors = useColors();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [popoverMounted, setPopoverMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | null>(null);

  const selectedDate = useMemo(() => parseYmd(value), [value]);
  const [draftDate, setDraftDate] = useState<Date | null>(selectedDate);
  const [month, setMonth] = useState<Date>(selectedDate ?? new Date());

  useEffect(() => {
    if (open) {
      setDraftDate(selectedDate);
      if (selectedDate) setMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
      return;
    }

    if (selectedDate) setMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [open, selectedDate]);

  const closePopover = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setClosing(true);
    setOpen(false);
    closeTimerRef.current = setTimeout(() => {
      setPopoverMounted(false);
      setClosing(false);
      closeTimerRef.current = null;
    }, 140);
  }, []);

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

  const updatePopoverPosition = useCallback(() => {
    if (!rootRef.current) return;

    const viewportPadding = 12;
    const gap = 8;
    const rect = rootRef.current.getBoundingClientRect();
    const pickerHeight = popoverRef.current?.offsetHeight ?? 430;
    const pickerWidth = Math.min(380, window.innerWidth - viewportPadding * 2);
    const spaceAbove = rect.top - viewportPadding;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const resolvedPlacement = popoverPlacement === 'auto'
      ? (spaceBelow < pickerHeight && spaceAbove > spaceBelow ? 'above' : 'below')
      : popoverPlacement;
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
  }, [popoverPlacement]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePopoverPosition();
  }, [open, month, updatePopoverPosition]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);
    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [open, updatePopoverPosition]);

  const dayPickerVars = {
    color: colors.foreground,
    '--rdp-accent-color': colors.primary,
    '--rdp-accent-background-color': `${colors.primary}22`,
    '--rdp-day_button-border-radius': '8px',
    '--rdp-day_button-border': '1px solid transparent',
    '--rdp-selected-border': `1px solid ${colors.primary}`,
    '--rdp-today-color': colors.primary,
    '--rdp-weekday-opacity': '1',
  } as CSSProperties;

  function openPopover() {
    if (disabled) return;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    const nextDraft = selectedDate ?? null;
    setDraftDate(nextDraft);
    setMonth(nextDraft ? new Date(nextDraft.getFullYear(), nextDraft.getMonth(), 1) : new Date());
    setPopoverStyle(null);
    setClosing(false);
    setPopoverMounted(true);
    setOpen(true);
  }

  function handleDone() {
    if (draftDate) onChange(formatLocalDateToYmd(draftDate));
    closePopover();
  }

  const popover = popoverMounted && !disabled && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={popoverRef}
          style={{
            ...popoverStyle,
            borderRadius: 14,
            border: `1px solid ${colors.border}`,
            background: colors.surface,
            boxShadow: '0 12px 28px rgba(0,0,0,0.16)',
            padding: 10,
            visibility: popoverStyle ? 'visible' : 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            animation: popoverStyle
              ? `${closing ? 'grammarCrammerDatePopoverOut' : 'grammarCrammerDatePopoverIn'} ${closing ? 130 : 160}ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards`
              : undefined,
            transformOrigin: 'bottom center',
          }}
        >
          <style>
            {`
              @keyframes grammarCrammerDatePopoverIn {
                from {
                  opacity: 0;
                  transform: translateY(10px) scale(0.985);
                }
                to {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }

              @keyframes grammarCrammerDatePopoverOut {
                from {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
                to {
                  opacity: 0;
                  transform: translateY(8px) scale(0.985);
                }
              }

              @media (prefers-reduced-motion: reduce) {
                @keyframes grammarCrammerDatePopoverIn {
                  from { opacity: 1; transform: none; }
                  to { opacity: 1; transform: none; }
                }

                @keyframes grammarCrammerDatePopoverOut {
                  from { opacity: 1; transform: none; }
                  to { opacity: 0; transform: none; }
                }
              }
            `}
          </style>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: 12,
              padding: '4px 4px 10px',
            }}
          >
            <button
              type="button"
              onClick={closePopover}
              style={{
                justifySelf: 'start',
                border: 0,
                background: 'transparent',
                color: colors.primary,
                fontSize: 15,
                cursor: 'pointer',
                padding: '8px 4px',
              }}
            >
              Cancel
            </button>
            <div
              style={{
                color: colors.foreground,
                fontSize: 16,
                fontWeight: 700,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {popoverTitle}
            </div>
            <button
              type="button"
              onClick={handleDone}
              style={{
                justifySelf: 'end',
                border: 0,
                background: 'transparent',
                color: colors.primary,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                padding: '8px 4px',
              }}
            >
              Done
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <DayPicker
              mode="single"
              month={month}
              selected={draftDate ?? undefined}
              onMonthChange={setMonth}
              captionLayout="dropdown"
              onSelect={(next) => {
                if (!next) return;
                setDraftDate(next);
              }}
              style={dayPickerVars}
              styles={{
                root: { color: colors.foreground, margin: '0 auto' },
                caption: { color: colors.foreground },
                nav_button: {
                  color: colors.foreground,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  background: colors.background_muted,
                },
                dropdown: {
                  color: colors.foreground,
                  background: colors.background_muted,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                },
                head_cell: { color: colors.foreground_secondary, fontSize: 12 },
                day: {
                  color: colors.foreground,
                  borderRadius: 8,
                },
                day_button: {
                  borderRadius: 8,
                  border: `1px solid transparent`,
                },
                day_selected: {
                  background: `${colors.primary}22`,
                  color: colors.foreground,
                  border: `1px solid ${colors.primary}`,
                },
                day_today: {
                  color: colors.primary,
                },
                day_outside: {
                  color: colors.foreground_muted,
                },
              }}
            />
          </div>
          {popoverFooter ? (
            <div
              style={{
                paddingTop: 10,
                marginTop: 8,
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ minWidth: 0 }}>
                {popoverFooter}
              </div>
            </div>
          ) : null}
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={rootRef} style={{ position: 'relative', zIndex: open ? 1200 : 1 }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => open ? closePopover() : openPopover()}
        style={{
          width: '100%',
          minHeight: 44,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          background: colors.background_muted,
          color: colors.foreground,
          padding: '0 12px',
          fontSize: 15,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span>{formatYmdForDisplay(value, placeholder)}</span>
        <Icon name="clock" size={14} color={colors.foreground} />
      </button>
      {popover}
    </div>
  );
}
