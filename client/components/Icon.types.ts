import type { StyleProp, ViewStyle } from 'react-native';

export type SemanticIcon =
  | 'settings'
  | 'close'
  | 'chevron-down'
  | 'chevron-right'
  | 'bullet'
  | 'pencil'
  | 'check'
  | 'hourglass'
  | 'warning'
  | 'clock'
  | 'not-started';

export const SF_SYMBOL_MAP: Record<SemanticIcon, string> = {
  'settings': 'gear',
  'close': 'xmark',
  'chevron-down': 'chevron.down',
  'chevron-right': 'chevron.right',
  'bullet': 'circle.fill',
  'pencil': 'square.and.pencil',
  'check': 'checkmark',
  'hourglass': 'hourglass',
  'warning': 'exclamationmark.triangle',
  'clock': 'clock',
  'not-started': 'sparkles',
};

export interface IconProps {
  name: SemanticIcon;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}
