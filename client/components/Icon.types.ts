import type { StyleProp, ViewStyle } from 'react-native';

export type SemanticIcon =
  | 'settings'
  | 'chevron-down'
  | 'chevron-right'
  | 'bullet'
  | 'pencil'
  | 'check'
  | 'hourglass'
  | 'warning'
  | 'clock';

export interface IconProps {
  name: SemanticIcon;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}
