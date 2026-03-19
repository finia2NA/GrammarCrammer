import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { clearAuthToken } from '@/lib/storage';
import { getSetting, setSetting, deleteApiKey } from '@/lib/api';
import { PillDropdown } from '@/components/PillDropdown';
import { PageSheetModal } from '@/components/PageSheetModal';

type CardOrder = 'sequential' | 'shuffled';

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ zIndex: 10 }} className="flex-row items-center justify-between mb-6">
      <View className="flex-1 mr-4">
        <Text className="text-foreground/80 text-sm font-medium">{label}</Text>
        {description && (
          <Text className="text-muted-foreground text-xs mt-1">{description}</Text>
        )}
      </View>
      {children}
    </View>
  );
}

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * A button that requires two taps: first tap changes the label to a
 * confirmation prompt, second tap executes the action. Resets after 3s.
 */
function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  destructive,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  const colors = useColors();
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fill, {
      toValue: armed ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [armed]);

  function handlePress() {
    if (armed) {
      if (timer.current) clearTimeout(timer.current);
      setArmed(false);
      onConfirm();
    } else {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 3000);
    }
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const bgColor = fill.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', destructive ? colors.destructive : colors.foreground],
  });

  const textColor = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [destructive ? colors.destructive : colors.foreground, destructive ? '#ffffff' : colors.background],
  });

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View
        style={{
          paddingVertical: 14,
          borderRadius: 12,
          borderWidth: 1,
          alignItems: 'center' as const,
          backgroundColor: bgColor,
          borderColor: destructive ? colors.destructive : colors.border,
        }}
      >
        <Animated.Text style={{ color: textColor, fontWeight: '600' }}>
          {armed ? confirmLabel : label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const router = useRouter();
  const [cardOrder, setCardOrder] = useState<CardOrder>('shuffled');

  useEffect(() => {
    if (visible) {
      getSetting('card_order').then(v => {
        if (v === 'sequential' || v === 'shuffled') setCardOrder(v);
      });
    }
  }, [visible]);

  function handleChangeOrder(next: CardOrder) {
    setCardOrder(next);
    setSetting('card_order', next);
  }

  async function handleLogout() {
    await clearAuthToken();
    onClose();
    router.replace('/onboarding');
  }

  async function handleDeleteApiKey() {
    try {
      await deleteApiKey();
    } catch { /* ignore */ }
    onClose();
    router.replace('/onboarding');
  }

  return (
    <PageSheetModal
      visible={visible}
      onClose={onClose}
      title="Settings"
      rightAction={{ label: 'Done', onPress: onClose }}
    >
      {/* Card order */}
      <SettingsRow
        label="Collection Card Order"
        description="Order of cards when studying a collection"
      >
        <PillDropdown
          value={cardOrder}
          options={['shuffled', 'sequential'] as const}
          onChange={handleChangeOrder}
          formatLabel={(v: CardOrder) => v === 'shuffled' ? 'Shuffled' : 'Sequential'}
        />
      </SettingsRow>

      {/* Account */}
      <View className="mt-auto gap-3">
        <Text className="text-foreground/80 text-sm font-medium mb-1">Account</Text>
        <ConfirmButton
          label="Delete API Key"
          confirmLabel="Tap again to delete key"
          onConfirm={handleDeleteApiKey}
          destructive
        />
        <ConfirmButton
          label="Log Out"
          confirmLabel="Tap again to log out"
          onConfirm={handleLogout}
        />
      </View>
    </PageSheetModal>
  );
}
