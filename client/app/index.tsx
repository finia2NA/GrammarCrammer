import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getAuthToken } from '@/lib/storage';
import { getMe, hydrateSettings } from '@/lib/api';
import { Colors } from '@/constants/theme';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const token = await getAuthToken();
      if (!token) {
        router.replace('/onboarding');
        return;
      }
      try {
        await getMe();
        await hydrateSettings();
        router.replace('/home');
      } catch {
        router.replace('/onboarding');
      }
    }
    check();
  }, [router]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
