import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { clearAuthToken } from '@/lib/storage';
import { getSetting, setSetting, deleteApiKey } from '@/lib/api';
import { PillDropdown } from '@/components/PillDropdown';

type CardOrder = 'sequential' | 'shuffled';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const insets = useSafeAreaInsets();
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

  function handleLogout() {
    const doLogout = async () => {
      await clearAuthToken();
      onClose();
      router.replace('/onboarding');
    };

    if (Platform.OS === 'web') {
      if (confirm('Log out? You will need to sign in again.')) doLogout();
    } else {
      Alert.alert(
        'Log Out',
        'You will need to sign in again to use the app.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log Out', style: 'destructive', onPress: doLogout },
        ],
      );
    }
  }

  function handleDeleteApiKey() {
    const doDelete = async () => {
      try {
        await deleteApiKey();
      } catch { /* ignore */ }
      onClose();
      router.replace('/onboarding');
    };

    if (Platform.OS === 'web') {
      if (confirm('Delete your API key? You will need to re-enter it.')) doDelete();
    } else {
      Alert.alert(
        'Delete API Key',
        'You will need to re-enter your API key to continue using the app.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ],
      );
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
        }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <View className="w-16" />
          <Text className="text-foreground text-lg font-bold">Settings</Text>
          <TouchableOpacity onPress={onClose} className="w-16 items-end">
            <Text className="text-primary text-base">Done</Text>
          </TouchableOpacity>
        </View>

        {/* Card order */}
        <Text className="text-foreground/80 text-sm font-medium mb-2">Collection Card Order</Text>
        <Text className="text-muted-foreground text-xs mb-3">
          When studying a collection, how should cards from different decks be arranged?
        </Text>
        <View style={{ zIndex: 10 }} className="mb-8">
          <PillDropdown
            value={cardOrder}
            options={['shuffled', 'sequential'] as const}
            onChange={handleChangeOrder}
            formatLabel={(v: CardOrder) => v === 'shuffled' ? 'Shuffled' : 'Sequential (by deck)'}
          />
        </View>

        {/* Account */}
        <View className="mt-auto gap-3">
          <Text className="text-foreground/80 text-sm font-medium mb-1">Account</Text>
          <TouchableOpacity
            className="py-3.5 rounded-xl border border-destructive items-center"
            onPress={handleDeleteApiKey}
          >
            <Text className="text-destructive font-semibold">Delete API Key</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="py-3.5 rounded-xl border border-border items-center"
            onPress={handleLogout}
          >
            <Text className="text-foreground font-semibold">Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
}
