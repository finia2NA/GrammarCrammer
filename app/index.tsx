import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getApiKey } from '@/lib/storage';
import { Colors } from '@/constants/theme';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    getApiKey().then((key) => {
      if (key) {
        router.replace('/home');
      } else {
        router.replace('/onboarding');
      }
    });
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-slate-950">
      <ActivityIndicator size="large" color={Colors.accent} />
    </View>
  );
}
