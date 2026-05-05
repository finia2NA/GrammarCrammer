/**
 * Fallback implementation of PillDropdown (Android + any unhandled platform).
 * Uses a custom inline dropdown. Platform-specific files take priority:
 *   PillDropdown.ios.tsx  — iOS
 *   PillDropdown.web.tsx  — Web
 */
import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Keyboard, Modal, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useColors } from '@/constants/theme';

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
  const [layout, setLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const viewRef = useRef<View>(null);
  const colors = useColors();
  const { width: windowWidth } = useWindowDimensions();

  const label = formatLabel ? formatLabel(value) : String(value);

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
    } else {
      Keyboard.dismiss();
      // On Android, measureInWindow is more reliable for positioning relative to the screen
      viewRef.current?.measureInWindow((x, y, width, height) => {
        setLayout({ x, y, width, height });
        setOpen(true);
      });
    }
  };

  return (
    <View ref={viewRef} collapsable={false}>
      <TouchableOpacity
        className="flex-row items-center gap-1.5 bg-background-muted rounded-lg px-3 py-1.5"
        onPress={toggleOpen}
        activeOpacity={0.8}
      >
        <Text className="text-foreground text-sm font-medium">{label}</Text>
        <Text className="text-foreground-secondary text-[10px]">{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setOpen(false)}
        >
          <View
            className="absolute rounded-xl shadow-2xl overflow-hidden"
            style={{
              top: layout.y + layout.height + 4,
              right: windowWidth - (layout.x + layout.width),
              minWidth: 130,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              elevation: 8,
            }}
          >
            {options.map((opt) => (
              <TouchableOpacity
                key={String(opt)}
                className={`px-4 py-2.5 ${opt === value ? 'bg-primary' : 'bg-background-muted'}`}
                onPress={() => { onChange(opt); setOpen(false); }}
              >
                <Text className={`text-sm font-medium ${opt === value ? 'text-primary-foreground' : 'text-foreground/80'}`}>
                  {formatLabel ? formatLabel(opt) : String(opt)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
