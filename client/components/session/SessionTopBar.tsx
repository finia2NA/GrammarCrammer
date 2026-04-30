import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/constants/theme';
import { formatCost } from '@/lib/format';

export const TOPBAR_HEIGHT = 56;

export function SessionTopBar({
  cardsRemaining, totalCost, totalSpend, onBack, hasContentBelow, insetTop,
}: {
  cardsRemaining: number;
  totalCost: number;
  totalSpend: number | null;
  onBack: () => void;
  hasContentBelow: boolean;
  insetTop: number;
}) {
  const colors = useColors();

  const inner = (
    <View style={{ height: TOPBAR_HEIGHT, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: 'rgba(128,128,128,0.15)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(128,128,128,0.25)' }}
        >
          <Text style={{ color: colors['foreground'] as string, opacity: 0.7, fontSize: 14, fontWeight: '600' }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: colors['foreground_secondary'] as string, fontSize: 14 }}>
          {cardsRemaining} card{cardsRemaining !== 1 ? 's' : ''} remaining
        </Text>
      </View>
      <Text style={{ color: colors['foreground_subtle'] as string, fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
        {formatCost(totalCost)}{totalSpend !== null ? ` (${formatCost(totalSpend)})` : ''}
      </Text>
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <GlassView
        glassEffectStyle={hasContentBelow ? 'regular' : 'none'}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, paddingTop: insetTop }}
      >
        {inner}
        {hasContentBelow && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(128,128,128,0.15)' }} />}
      </GlassView>
    );
  }

  const bg = colors['background'] as string;
  const solidHeight = insetTop + TOPBAR_HEIGHT;
  const totalHeight = solidHeight + 32;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }}>
      {hasContentBelow && (
        <LinearGradient
          colors={[bg, bg, bg + '00'] as any}
          locations={[0, solidHeight / totalHeight, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: totalHeight }}
        />
      )}
      <View style={{ paddingTop: insetTop }}>{inner}</View>
    </View>
  );
}
