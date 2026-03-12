import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { KeyboardProvider } from 'react-native-keyboard-controller';

export default function RootLayout() {
  return (
    <KeyboardProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#020617' } }} />
      <StatusBar style="auto" />
    </KeyboardProvider>
  );
}
