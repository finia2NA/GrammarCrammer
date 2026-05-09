import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { getMe } from '@/lib/api';
import { getAuthToken, setUserRole } from '@/lib/storage';

export function useRequireAdmin(): boolean {
  const router = useRouter();
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAdminAccess() {
      const token = await getAuthToken();
      if (!token) {
        router.replace('/onboarding');
        return;
      }

      const me = await getMe();
      await setUserRole(me.role);
      if (me.role !== 'admin') {
        router.replace('/home');
        return;
      }

      if (mounted) setCanRender(true);
    }

    checkAdminAccess().catch(() => {
      // getMe handles expired sessions globally by redirecting to onboarding.
    });

    return () => { mounted = false; };
  }, [router]);

  return canRender;
}
