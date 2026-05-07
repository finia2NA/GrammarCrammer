import { Pressable } from 'react-native';
import { useColors } from '@/constants/theme';

interface ThemedSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function ThemedSwitch({ value, onValueChange, disabled }: ThemedSwitchProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      style={{
        width: 48,
        height: 22,
        borderRadius: 11,
        backgroundColor: value ? colors.surface : colors.surface, // Could change color here, but not finding a good one in the theme rn
        justifyContent: 'center',
        padding: 2,
        opacity: disabled ? 0.4 : 1,
        // @ts-expect-error web-only
        transition: 'background-color 0.2s ease',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div
        style={{
          width: 28,
          height: 18,
          borderRadius: 9,
          backgroundColor: colors.primary,
          transform: `translateX(${value ? 16 : 0}px)`,
          transition: 'transform 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      />
    </Pressable>
  );
}
