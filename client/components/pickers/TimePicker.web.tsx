import { useEffect, useRef, useState } from 'react';
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
  const [open, setOpen] = useState(false);
  const { hour, minute } = splitTime(value);
  const [draftHour, setDraftHour] = useState(hour);
  const [draftMinute, setDraftMinute] = useState(minute);

  useEffect(() => {
    setDraftHour(hour);
    setDraftMinute(minute);
  }, [hour, minute]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  function apply() {
    onChange(normalizeTime(`${draftHour}:${draftMinute}`));
    setOpen(false);
  }

  return (
    <div ref={rootRef} style={{ minWidth: 180, position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: 180,
          height: 38,
          borderRadius: 10,
          border: `1px solid ${colors.border}`,
          background: colors.background_muted,
          color: colors.foreground,
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span>{normalizeTime(value)}</span>
        <Icon name="clock" size={14} color={colors.foreground} />
      </button>

      {open && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: 44,
            right: 0,
            zIndex: 60,
            width: 220,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            background: colors.surface,
            boxShadow: '0 12px 28px rgba(0,0,0,0.16)',
            padding: 10,
            display: 'grid',
            gap: 8,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select
              value={draftHour}
              onChange={(e) => setDraftHour(e.target.value)}
              style={{
                height: 34,
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: colors.background_muted,
                color: colors.foreground,
                padding: '0 8px',
              }}
            >
              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <select
              value={draftMinute}
              onChange={(e) => setDraftMinute(e.target.value)}
              style={{
                height: 34,
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: colors.background_muted,
                color: colors.foreground,
                padding: '0 8px',
              }}
            >
              {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={apply}
            style={{
              height: 34,
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              background: colors.background_muted,
              color: colors.foreground,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
