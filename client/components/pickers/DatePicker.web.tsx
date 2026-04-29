import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { Icon } from '@/components/Icon';
import { useColors } from '@/constants/theme';
import { formatLocalDateToYmd, formatYmdForDisplay, parseYmd } from './dateUtils';
import 'react-day-picker/style.css';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick date',
  disabled = false,
}: DatePickerProps) {
  const colors = useColors();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(true);

  const selectedDate = useMemo(() => parseYmd(value), [value]);
  const [month, setMonth] = useState<Date>(selectedDate ?? new Date());

  useEffect(() => {
    if (selectedDate) setMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open || !rootRef.current) return;
    const pickerHeightEstimate = 360;
    const rect = rootRef.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    setOpenUpward(spaceBelow < pickerHeightEstimate && spaceAbove > spaceBelow);
  }, [open]);

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

  return (
    <div ref={rootRef} style={{ position: 'relative', zIndex: open ? 1200 : 1 }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
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

      {open && !disabled && (
        <div
          style={{
            position: 'absolute',
            zIndex: 1300,
            left: 0,
            ...(openUpward
              ? { bottom: 'calc(100% + 8px)' }
              : { top: 'calc(100% + 8px)' }),
            borderRadius: 14,
            border: `1px solid ${colors.border}`,
            background: colors.surface,
            boxShadow: '0 12px 28px rgba(0,0,0,0.16)',
            padding: 10,
          }}
        >
          <DayPicker
            mode="single"
            month={month}
            selected={selectedDate ?? undefined}
            onMonthChange={setMonth}
            captionLayout="dropdown"
            onSelect={(next) => {
              if (!next) return;
              onChange(formatLocalDateToYmd(next));
              setOpen(false);
            }}
            style={dayPickerVars}
            styles={{
              root: { color: colors.foreground },
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
      )}
    </div>
  );
}
