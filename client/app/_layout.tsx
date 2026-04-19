import '../global.css';
import { View, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { darkThemeVars, lightThemeVars, useColors } from '@/constants/theme';

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = useColors();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[{ flex: 1 }, scheme === 'dark' ? darkThemeVars : lightThemeVars]}>
        <KeyboardProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
          <StatusBar style="auto" />
        </KeyboardProvider>
      </View>
    </GestureHandlerRootView>
  );
}
