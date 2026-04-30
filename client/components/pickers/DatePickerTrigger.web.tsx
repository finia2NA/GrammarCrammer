import { Icon } from '@/components/Icon';
import { useColors } from '@/constants/theme';
import { formatYmdForDisplay } from './dateUtils';

interface DatePickerTriggerProps {
  value: string;
  placeholder: string;
  disabled: boolean;
  onPress: () => void;
}

export function DatePickerTrigger({
  value,
  placeholder,
  disabled,
  onPress,
}: DatePickerTriggerProps) {
  const colors = useColors();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPress}
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
  );
}
