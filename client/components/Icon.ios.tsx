import { SymbolView } from 'expo-symbols';
import type { IconProps, SemanticIcon } from './Icon.types';

const SF_MAP: Record<SemanticIcon, string> = {
  'settings':       'gear',
  'chevron-down':   'chevron.down',
  'chevron-right':  'chevron.right',
  'bullet':         'circle.fill',
  'pencil':         'square.and.pencil',
  'check':          'checkmark',
  'hourglass':      'hourglass',
  'warning':        'exclamationmark.triangle',
  'clock':          'clock',
};

export function Icon({ name, size = 18, color, style }: IconProps) {
  return (
    <SymbolView
      name={SF_MAP[name] as any}
      size={size}
      tintColor={color}
      style={style as any}
    />
  );
}
