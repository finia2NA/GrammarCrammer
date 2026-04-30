import { type CSSProperties, type ReactNode } from 'react';
// @ts-ignore
import { createPortal } from 'react-dom';
import { useColors } from '@/constants/theme';
import { usePopoverLifecycle, useWebPopover } from './useWebPopoverPosition';

export type PlatformPopoverPlacement = 'auto' | 'above' | 'below';

export interface PlatformPopoverTriggerActions {
  open: boolean;
  openPopover: () => void;
  closePopover: () => void;
  togglePopover: () => void;
}

interface PlatformPopoverProps {
  title: string;
  disabled?: boolean;
  placement?: PlatformPopoverPlacement;
  fallbackHeight: number;
  maxWidth: number;
  closeDelay?: number;
  footer?: ReactNode;
  onDone: () => void;
  onCancel?: () => void;
  repositionDeps?: unknown[];
  anchorDisplay?: CSSProperties['display'];
  children: ReactNode;
  trigger: (actions: PlatformPopoverTriggerActions) => ReactNode;
}

export function PlatformPopover({
  title,
  disabled = false,
  placement = 'auto',
  fallbackHeight,
  maxWidth,
  closeDelay = 140,
  footer,
  onDone,
  onCancel,
  repositionDeps = [],
  anchorDisplay = 'block',
  children,
  trigger,
}: PlatformPopoverProps) {
  const colors = useColors();
  const popover = useWebPopover({
    fallbackHeight,
    maxWidth,
    placement,
    closeDelay,
  });

  usePopoverLifecycle(popover.open, popover.updatePosition, repositionDeps);

  function handleCancel() {
    onCancel?.();
    popover.closePopover();
  }

  function handleDone() {
    onDone();
    popover.closePopover();
  }

  const actions: PlatformPopoverTriggerActions = {
    open: popover.open,
    openPopover: popover.openPopover,
    closePopover: popover.closePopover,
    togglePopover: popover.open ? popover.closePopover : popover.openPopover,
  };

  const portal = popover.popoverMounted && !disabled && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={popover.popoverRef}
          style={{
            ...popover.popoverStyle,
            borderRadius: 14,
            border: `1px solid ${colors.border}`,
            background: colors.background,
            boxShadow: '0 12px 28px rgba(0,0,0,0.16)',
            padding: 10,
            visibility: popover.popoverStyle ? 'visible' : 'hidden',
            display: 'grid',
            gap: 10,
            animation: popover.popoverStyle
              ? `${popover.closing ? 'grammarCrammerPlatformPopoverOut' : 'grammarCrammerPlatformPopoverIn'} ${popover.closing ? 130 : 160}ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards`
              : undefined,
            transformOrigin: popover.resolvedPlacement === 'above' ? 'bottom center' : 'top center',
          }}
        >
          <style>
            {`
              @keyframes grammarCrammerPlatformPopoverIn {
                from { opacity: 0; transform: translateY(10px) scale(0.985); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }

              @keyframes grammarCrammerPlatformPopoverOut {
                from { opacity: 1; transform: translateY(0) scale(1); }
                to { opacity: 0; transform: translateY(8px) scale(0.985); }
              }

              @media (prefers-reduced-motion: reduce) {
                @keyframes grammarCrammerPlatformPopoverIn {
                  from { opacity: 1; transform: none; }
                  to { opacity: 1; transform: none; }
                }

                @keyframes grammarCrammerPlatformPopoverOut {
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
              onClick={handleCancel}
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
              {title}
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

          {children}

          {footer ? (
            <div
              style={{
                paddingTop: 10,
                marginTop: 8,
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ minWidth: 0 }}>
                {footer}
              </div>
            </div>
          ) : null}
        </div>,
        document.body,
      )
    : null;

  return (
    <div
      ref={popover.rootRef}
      style={{
        position: 'relative',
        zIndex: popover.open ? 1200 : 1,
        display: anchorDisplay,
      }}
    >
      {trigger(actions)}
      {portal}
    </div>
  );
}
