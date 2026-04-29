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

export interface IconProps {
  name: SemanticIcon;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}
