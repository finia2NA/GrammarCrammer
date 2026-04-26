import { Ionicons } from '@expo/vector-icons';
import type { IconProps, SemanticIcon } from './Icon.types';

const IONICONS_MAP: Record<SemanticIcon, string> = {
  'settings':       'settings-outline',
  'chevron-down':   'chevron-down',
  'chevron-right':  'chevron-forward',
  'bullet':         'ellipse',
  'pencil':         'create-outline',
  'check':          'checkmark',
  'hourglass':      'hourglass-outline',
  'warning':        'warning-outline',
  'clock':          'time-outline',
};

export function Icon({ name, size = 18, color, style }: IconProps) {
  return (
    <Ionicons
      name={IONICONS_MAP[name] as any}
      size={size}
      color={color ?? '#888'}
      style={style as any}
    />
  );
}
