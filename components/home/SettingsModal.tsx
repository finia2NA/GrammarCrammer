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
import { clearApiKey } from '@/lib/storage';
import { getSetting, setSetting } from '@/lib/deck-store';

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

  function handleToggleOrder() {
    const next: CardOrder = cardOrder === 'shuffled' ? 'sequential' : 'shuffled';
    setCardOrder(next);
    setSetting('card_order', next);
  }

  function handleDeleteApiKey() {
    const doDelete = async () => {
      await clearApiKey();
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
        <TouchableOpacity
          className="bg-card border border-border rounded-xl px-4 py-3.5 flex-row items-center justify-between mb-8"
          onPress={handleToggleOrder}
          activeOpacity={0.7}
        >
          <Text className="text-foreground text-base">
            {cardOrder === 'shuffled' ? 'Shuffled' : 'Sequential (by deck)'}
          </Text>
          <Text className="text-muted-foreground text-sm">Tap to toggle</Text>
        </TouchableOpacity>

        {/* Danger zone */}
        <View className="mt-auto">
          <Text className="text-foreground/80 text-sm font-medium mb-3">Account</Text>
          <TouchableOpacity
            className="py-3.5 rounded-xl border border-destructive items-center"
            onPress={handleDeleteApiKey}
          >
            <Text className="text-destructive font-semibold">Delete API Key</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
}
