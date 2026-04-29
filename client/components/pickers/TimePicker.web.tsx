import { type CSSProperties, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
// react-dom is present for web builds, but this app does not currently install @types/react-dom.
// @ts-ignore
import { createPortal } from 'react-dom';
import { Icon } from '@/components/Icon';
import { useColors } from '@/constants/theme';
import { normalizeTime, splitTime } from './timeUtils';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TimePicker({ value, onChange, disabled = false }: TimePickerProps) {
  const colors = useColors();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [popoverMounted, setPopoverMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | null>(null);
  const normalizedValue = useMemo(() => normalizeTime(value), [value]);
  const { hour, minute } = splitTime(normalizedValue);
  const [textValue, setTextValue] = useState(normalizedValue);
  const [draftHour, setDraftHour] = useState(hour);
  const [draftMinute, setDraftMinute] = useState(minute);

  useEffect(() => {
    setTextValue(normalizedValue);
    if (!open) {
      setDraftHour(hour);
      setDraftMinute(minute);
    }
  }, [hour, minute, normalizedValue, open]);

  const closePopover = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setClosing(true);
    setOpen(false);
    closeTimerRef.current = setTimeout(() => {
      setPopoverMounted(false);
      setClosing(false);
      closeTimerRef.current = null;
    }, 130);
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
    const pickerHeight = popoverRef.current?.offsetHeight ?? 230;
    const pickerWidth = Math.min(300, window.innerWidth - viewportPadding * 2);
    const spaceAbove = rect.top - viewportPadding;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const openAbove = spaceBelow < pickerHeight && spaceAbove > spaceBelow;
    const rawTop = openAbove ? rect.top - pickerHeight - gap : rect.bottom + gap;
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
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePopoverPosition();
  }, [open, updatePopoverPosition]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);
    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [open, updatePopoverPosition]);

  function commitTextValue() {
    const normalized = normalizeTime(textValue);
    setTextValue(normalized);
    onChange(normalized);
  }

  function openPopover() {
    if (disabled) return;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    const { hour: nextHour, minute: nextMinute } = splitTime(textValue);
    setDraftHour(nextHour);
    setDraftMinute(nextMinute);
    setPopoverStyle(null);
    setClosing(false);
    setPopoverMounted(true);
    setOpen(true);
  }

  function handleDone() {
    const next = normalizeTime(`${draftHour}:${draftMinute}`);
    setTextValue(next);
    onChange(next);
    closePopover();
  }

  const inputStyle: CSSProperties = {
    width: 68,
    height: 30,
    border: 0,
    outline: 'none',
    background: 'transparent',
    color: colors.foreground,
    fontSize: 14,
    fontWeight: 500,
    padding: '0 0 0 12px',
  };

  const selectStyle: CSSProperties = {
    height: 42,
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: colors.background_muted,
    color: colors.foreground,
    padding: '0 10px',
    fontSize: 17,
    fontWeight: 650,
  };

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
            display: 'grid',
            gap: 10,
            animation: popoverStyle
              ? `${closing ? 'grammarCrammerTimePopoverOut' : 'grammarCrammerTimePopoverIn'} ${closing ? 130 : 160}ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards`
              : undefined,
            transformOrigin: 'top center',
          }}
        >
          <style>
            {`
              @keyframes grammarCrammerTimePopoverIn {
                from { opacity: 0; transform: translateY(10px) scale(0.985); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }

              @keyframes grammarCrammerTimePopoverOut {
                from { opacity: 1; transform: translateY(0) scale(1); }
                to { opacity: 0; transform: translateY(8px) scale(0.985); }
              }

              @media (prefers-reduced-motion: reduce) {
                @keyframes grammarCrammerTimePopoverIn {
                  from { opacity: 1; transform: none; }
                  to { opacity: 1; transform: none; }
                }

                @keyframes grammarCrammerTimePopoverOut {
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
              padding: '4px 4px 2px',
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
            <div style={{ color: colors.foreground, fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>
              Due Time
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <select value={draftHour} onChange={(e) => setDraftHour(e.target.value)} style={selectStyle}>
              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <select value={draftMinute} onChange={(e) => setDraftMinute(e.target.value)} style={selectStyle}>
              {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div
      ref={rootRef}
      style={{
        width: 106,
        height: 33,
        borderRadius: 8,
        border: `1px solid ${colors.border}`,
        background: colors.background_muted,
        display: 'flex',
        alignItems: 'center',
        opacity: disabled ? 0.5 : 1,
        overflow: 'hidden',
      }}
    >
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={textValue}
        onChange={(e) => setTextValue(e.target.value.replace(/[^0-9:]/g, '').slice(0, 5))}
        onBlur={commitTextValue}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
          if (e.key === 'Escape') {
            setTextValue(normalizedValue);
            e.currentTarget.blur();
          }
        }}
        aria-label="Daily due release time"
        style={inputStyle}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={open ? closePopover : openPopover}
        aria-label="Open time picker"
        style={{
          width: 36,
          height: '100%',
          border: 0,
          borderLeft: `1px solid ${colors.border}`,
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'default' : 'pointer',
          color: colors.foreground,
        }}
      >
        <Icon name="clock" size={14} color={colors.foreground} />
      </button>
      {popover}
    </div>
  );
}
