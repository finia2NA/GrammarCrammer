import '../global.css';
import { View, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { vars } from 'nativewind';
import { useColors } from '@/constants/theme';

const darkVars = vars({
  '--color-background':         '2 6 23',
  '--color-foreground':         '255 255 255',
  '--color-card':               '15 23 42',
  '--color-input':              '30 41 59',
  '--color-muted':              '51 65 85',
  '--color-border':             '71 85 105',
  '--color-muted-foreground':   '148 163 184',
  '--color-primary':            '99 102 241',
  '--color-primary-foreground': '255 255 255',
  '--color-destructive':        '248 113 113',
});

const lightVars = vars({
  '--color-background':         '248 250 252',
  '--color-foreground':         '15 23 42',
  '--color-card':               '255 255 255',
  '--color-input':              '241 245 249',
  '--color-muted':              '226 232 240',
  '--color-border':             '203 213 225',
  '--color-muted-foreground':   '71 85 105',
  '--color-primary':            '99 102 241',
  '--color-primary-foreground': '255 255 255',
  '--color-destructive':        '220 38 38',
});

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = useColors();

  return (
    <View style={[{ flex: 1 }, scheme === 'dark' ? darkVars : lightVars]}>
      <KeyboardProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
        <StatusBar style="auto" />
      </KeyboardProvider>
    </View>
  );
}
