import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
// @ts-ignore
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { Icon } from '@/components/Icon';
import { useColors } from '@/constants/theme';
import { formatLocalDateToYmd, formatYmdForDisplay, parseYmd } from './dateUtils';
import { useWebPopover, usePopoverLifecycle } from './useWebPopoverPosition';
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
  const popover = useWebPopover({
    fallbackHeight: 430,
    maxWidth: 380,
    placement: popoverPlacement,
    closeDelay: 140,
  });

  const selectedDate = useMemo(() => parseYmd(value), [value]);
  const [draftDate, setDraftDate] = useState<Date | null>(selectedDate);
  const [month, setMonth] = useState<Date>(selectedDate ?? new Date());

  useEffect(() => {
    if (popover.open) {
      setDraftDate(selectedDate);
      if (selectedDate) setMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
      return;
    }

    if (selectedDate) setMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [popover.open, selectedDate]);

  usePopoverLifecycle(popover.open, popover.updatePosition, [month]);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    const nextDraft = selectedDate ?? null;
    setDraftDate(nextDraft);
    setMonth(nextDraft ? new Date(nextDraft.getFullYear(), nextDraft.getMonth(), 1) : new Date());
    popover.openPopover();
  }, [disabled, selectedDate, popover]);

  function handleDone() {
    if (draftDate) onChange(formatLocalDateToYmd(draftDate));
    popover.closePopover();
  }

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
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            animation: popover.popoverStyle
              ? `${popover.closing ? 'grammarCrammerDatePopoverOut' : 'grammarCrammerDatePopoverIn'} ${popover.closing ? 130 : 160}ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards`
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
    <div ref={popover.rootRef} style={{ position: 'relative', zIndex: popover.open ? 1200 : 1 }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => popover.open ? popover.closePopover() : handleOpen()}
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
      {portal}
    </div>
  );
}
