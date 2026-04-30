import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatHex } from 'culori';

const RAINBOW_STEPS = 7;
const RAINBOW_CYCLE = Array.from({ length: RAINBOW_STEPS }, (_, i) =>
  formatHex({ mode: 'oklch', l: 0.7, c: 0.18, h: (i / (RAINBOW_STEPS - 1)) * 360 })!,
);
const RAINBOW_TILED = [...RAINBOW_CYCLE, ...RAINBOW_CYCLE.slice(1)];

export function RainbowButton({ onPress, label }: { onPress: () => void; label: string }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [btnWidth, setBtnWidth] = useState(0);
  const animStarted = useRef(false);

  useEffect(() => {
    if (!btnWidth || animStarted.current) return;
    animStarted.current = true;

    const sweep = btnWidth * 2;
    let fastCount = 0;

    function runSweep() {
      const duration = fastCount < 2 ? 1500 : 5000;
      fastCount++;

      Animated.timing(translateX, {
        toValue: -sweep,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        translateX.setValue(0);
        runSweep();
      });
    }

    runSweep();
  }, [btnWidth, translateX]);

  return (
    <TouchableOpacity
      className="flex-1 rounded-xl overflow-hidden"
      onPress={onPress}
      activeOpacity={0.8}
      onLayout={e => setBtnWidth(e.nativeEvent.layout.width)}
    >
      <View style={{ height: 50, justifyContent: 'center', alignItems: 'center' }}>
        {btnWidth > 0 && (
          <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: btnWidth * 4, transform: [{ translateX }] }}>
            <LinearGradient
              colors={[...RAINBOW_TILED]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        )}
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 15, zIndex: 1 }}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}
