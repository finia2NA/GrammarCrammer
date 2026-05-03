import { type CSSProperties } from 'react';
import { Icon } from '@/components/Icon';
import { useColors } from '@/constants/theme';

interface TimePickerTriggerProps {
  value?: string;
  textValue: string;
  normalizedValue: string;
  disabled: boolean;
  useNativeInput?: boolean;
  onTextValueChange: (value: string) => void;
  onCommitTextValue: () => void;
  onResetTextValue: () => void;
  onNativeInputChange?: (value: string) => void;
  onPress: () => void;
}

export function TimePickerTrigger({
  textValue,
  normalizedValue,
  disabled,
  useNativeInput = false,
  onTextValueChange,
  onCommitTextValue,
  onResetTextValue,
  onNativeInputChange,
  onPress,
}: TimePickerTriggerProps) {
  const colors = useColors();
  const containerStyle: CSSProperties = {
    width: 106,
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: colors.background_muted,
    display: 'flex',
    alignItems: 'center',
    opacity: disabled ? 0.5 : 1,
    overflow: 'hidden',
  };
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

  if (useNativeInput) {
    return (
      <div
        style={{
          ...containerStyle,
          position: 'relative',
          height: 44,
          padding: '0 12px',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            color: colors.foreground,
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          {normalizedValue}
        </span>
        <Icon name="clock" size={14} color={colors.foreground} />
        <input
          type="time"
          disabled={disabled}
          value={normalizedValue}
          onChange={(event) => onNativeInputChange?.(event.target.value)}
          aria-label="Daily due release time"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: disabled ? 'default' : 'pointer',
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        ...containerStyle,
        height: 33,
      }}
    >
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={textValue}
        onChange={(event) => onTextValueChange(event.target.value.replace(/[^0-9:]/g, '').slice(0, 5))}
        onBlur={onCommitTextValue}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
          if (event.key === 'Escape') {
            onResetTextValue();
            event.currentTarget.blur();
          }
        }}
        aria-label="Daily due release time"
        style={inputStyle}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={onPress}
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
    </div>
  );
}
