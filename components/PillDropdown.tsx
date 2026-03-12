/**
 * Fallback implementation of PillDropdown (Android + any unhandled platform).
 * Uses a custom inline dropdown. Platform-specific files take priority:
 *   PillDropdown.ios.tsx  — iOS
 *   PillDropdown.web.tsx  — Web
 */
import { useState } from 'react';
import { View, Text, TouchableOpacity, Keyboard } from 'react-native';

export interface PillDropdownProps<T extends string | number> {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  formatLabel?: (v: T) => string;
}

export function PillDropdown<T extends string | number>({
  value, options, onChange, formatLabel,
}: PillDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const label = formatLabel ? formatLabel(value) : String(value);

  return (
    <View style={{ position: 'relative' }}>
      <TouchableOpacity
        className="flex-row items-center gap-1.5 bg-slate-800 rounded-lg px-3 py-1.5"
        onPress={() => { Keyboard.dismiss(); setOpen(o => !o); }}
        activeOpacity={0.8}
      >
        <Text className="text-white text-sm font-medium">{label}</Text>
        <Text className="text-slate-500 text-[10px]">{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View
          className="absolute right-0 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden"
          style={{ top: '100%', marginTop: 4, zIndex: 100, minWidth: 130 } as any}
        >
          {options.map((opt) => (
            <TouchableOpacity
              key={String(opt)}
              className={`px-4 py-2.5 ${opt === value ? 'bg-indigo-600' : ''}`}
              onPress={() => { onChange(opt); setOpen(false); }}
            >
              <Text className={`text-sm font-medium ${opt === value ? 'text-white' : 'text-slate-300'}`}>
                {formatLabel ? formatLabel(opt) : String(opt)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
