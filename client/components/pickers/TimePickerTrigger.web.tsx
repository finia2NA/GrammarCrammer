import { type CSSProperties } from 'react';
import { Icon } from '@/components/Icon';
import { useColors } from '@/constants/theme';

interface TimePickerTriggerProps {
  value?: string;
  textValue: string;
  normalizedValue: string;
  disabled: boolean;
  onTextValueChange: (value: string) => void;
  onCommitTextValue: () => void;
  onResetTextValue: () => void;
  onPress: () => void;
}

export function TimePickerTrigger({
  textValue,
  disabled,
  onTextValueChange,
  onCommitTextValue,
  onResetTextValue,
  onPress,
}: TimePickerTriggerProps) {
  const colors = useColors();
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

  return (
    <div
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
