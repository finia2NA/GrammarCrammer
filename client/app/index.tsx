import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getAuthToken, setUserId } from '@/lib/storage';
import { getMe, hydrateSettings } from '@/lib/api';
import { Colors } from '@/constants/theme';
import { analytics } from '@/lib/analytics';
import { BrandLogo } from '@/components/BrandLogo';

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
        const me = await getMe();
        await setUserId(me.id);
        analytics.identify(me.id, {
          has_api_key: me.hasApiKey,
          central_key_available: me.centralKeyAvailable,
          auth_methods: me.authMethods,
        });
        await hydrateSettings();
        router.replace('/home');
      } catch {
        router.replace('/onboarding');
      }
    }
    check();
  }, [router]);

  return (
    <View className="flex-1 items-center justify-center bg-background" style={{ gap: 28 }}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <BrandLogo direction="column" size={84} wordmarkSize={30} />
    </View>
  );
}
