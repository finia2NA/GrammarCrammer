import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <KeyboardProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bgApp } }} />
      <StatusBar style="auto" />
    </KeyboardProvider>
  );
}
