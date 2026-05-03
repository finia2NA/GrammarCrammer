import { SymbolView } from 'expo-symbols';
import { SF_SYMBOL_MAP, type IconProps } from './Icon.types';

export function Icon({ name, size = 18, color, style }: IconProps) {
  return (
    <SymbolView
      name={SF_SYMBOL_MAP[name] as any}
      size={size}
      tintColor={color}
      style={style as any}
    />
  );
}
