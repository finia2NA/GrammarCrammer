import { type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
// @ts-ignore
import { createPortal } from 'react-dom';
import { Icon } from '@/components/Icon';
import { useColors } from '@/constants/theme';
import { normalizeTime, splitTime } from './timeUtils';
import { useWebPopover, usePopoverLifecycle } from './useWebPopoverPosition';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TimePicker({ value, onChange, disabled = false }: TimePickerProps) {
  const colors = useColors();
  const popover = useWebPopover({
    fallbackHeight: 230,
    maxWidth: 300,
    closeDelay: 130,
  });

  const normalizedValue = useMemo(() => normalizeTime(value), [value]);
  const { hour, minute } = splitTime(normalizedValue);
  const [textValue, setTextValue] = useState(normalizedValue);
  const [draftHour, setDraftHour] = useState(hour);
  const [draftMinute, setDraftMinute] = useState(minute);

  useEffect(() => {
    setTextValue(normalizedValue);
    if (!popover.open) {
      setDraftHour(hour);
      setDraftMinute(minute);
    }
  }, [hour, minute, normalizedValue, popover.open]);

  usePopoverLifecycle(popover.open, popover.updatePosition);

  function commitTextValue() {
    const normalized = normalizeTime(textValue);
    setTextValue(normalized);
    onChange(normalized);
  }

  const handleOpen = useCallback(() => {
    if (disabled) return;
    const { hour: nextHour, minute: nextMinute } = splitTime(textValue);
    setDraftHour(nextHour);
    setDraftMinute(nextMinute);
    popover.openPopover();
  }, [disabled, textValue, popover]);

  function handleDone() {
    const next = normalizeTime(`${draftHour}:${draftMinute}`);
    setTextValue(next);
    onChange(next);
    popover.closePopover();
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

  const portal = popover.popoverMounted && !disabled && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={popover.popoverRef}
          style={{
            ...popover.popoverStyle,
            borderRadius: 14,
            border: `1px solid ${colors.border}`,
            background: colors.surface,
            boxShadow: '0 12px 28px rgba(0,0,0,0.16)',
            padding: 10,
            visibility: popover.popoverStyle ? 'visible' : 'hidden',
            display: 'grid',
            gap: 10,
            animation: popover.popoverStyle
              ? `${popover.closing ? 'grammarCrammerTimePopoverOut' : 'grammarCrammerTimePopoverIn'} ${popover.closing ? 130 : 160}ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards`
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
              onClick={popover.closePopover}
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
      ref={popover.rootRef}
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
        onClick={popover.open ? popover.closePopover : handleOpen}
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
      {portal}
    </div>
  );
}
