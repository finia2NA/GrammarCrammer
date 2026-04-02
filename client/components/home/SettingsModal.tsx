import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { clearAuthToken } from '@/lib/storage';
import { getSetting, setSetting, deleteApiKey, setApiKey, validateApiKey, getUsageStatus } from '@/lib/api';
import type { UsageStatus } from '@/lib/api';
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

type KeyPreference = 'central' | 'own';

function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function UsageBar({ used, limit, colors }: { used: number; limit: number; colors: ReturnType<typeof useColors> }) {
  const pct = limit > 0 ? Math.min(used / limit, 1) : 0;
  const barColor = pct >= 0.9 ? colors.destructive : colors.primary;

  return (
    <View className="mt-2">
      <View className="flex-row justify-between mb-1">
        <Text className="text-muted-foreground text-xs">
          {formatCost(used)} / {formatCost(limit)}
        </Text>
        <Text className="text-muted-foreground text-xs">
          {(pct * 100).toFixed(0)}%
        </Text>
      </View>
      <View className="h-2 rounded-full bg-muted overflow-hidden">
        <View
          style={{ width: `${pct * 100}%`, backgroundColor: barColor }}
          className="h-full rounded-full"
        />
      </View>
    </View>
  );
}

function AddApiKeyForm({ onAdded }: { onAdded: () => void }) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const trimmed = key.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      const { valid, error: validationError } = await validateApiKey(trimmed);
      if (!valid) {
        setError(validationError ?? 'Invalid API key.');
        return;
      }
      await setApiKey(trimmed);
      setKey('');
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save key.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="mt-2 gap-2">
      <TextInput
        className="bg-input text-foreground rounded-lg px-3 py-2 text-sm"
        placeholder="sk-ant-..."
        placeholderTextColor="#888"
        value={key}
        onChangeText={setKey}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />
      {error ? <Text className="text-xs" style={{ color: '#f87171' }}>{error}</Text> : null}
      <TouchableOpacity
        className="bg-primary rounded-lg py-2 items-center"
        onPress={handleSubmit}
        disabled={loading || !key.trim()}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text className="text-primary-foreground text-sm font-semibold">Verify & Save</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const router = useRouter();
  const colors = useColors();
  const [cardOrder, setCardOrder] = useState<CardOrder>('shuffled');
  const [judgeWithExplanation, setJudgeWithExplanation] = useState<'on' | 'off'>('on');
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [showAddKey, setShowAddKey] = useState(false);

  useEffect(() => {
    if (visible) {
      getSetting('card_order').then(v => {
        if (v === 'sequential' || v === 'shuffled') setCardOrder(v);
      });
      getSetting('judge_with_explanation').then(v => {
        if (v === 'on' || v === 'off') setJudgeWithExplanation(v);
      });
      getUsageStatus().then(setUsageStatus).catch(() => {});
      setShowAddKey(false);
    }
  }, [visible]);

  function handleChangeOrder(next: CardOrder) {
    setCardOrder(next);
    setSetting('card_order', next);
  }

  function handleChangeJudgeExplanation(next: 'on' | 'off') {
    setJudgeWithExplanation(next);
    setSetting('judge_with_explanation', next);
  }

  function handleChangePreference(next: KeyPreference) {
    if (!usageStatus) return;
    setUsageStatus({ ...usageStatus, preference: next });
    setSetting('api_key_preference', next);
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
    if (usageStatus) {
      setUsageStatus({ ...usageStatus, hasOwnKey: false });
    }
    // Only redirect if no central key available
    if (!usageStatus?.centralKeyAvailable) {
      onClose();
      router.replace('/onboarding');
    }
  }

  function handleKeyAdded() {
    setShowAddKey(false);
    // Refresh usage status
    getUsageStatus().then(setUsageStatus).catch(() => {});
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

      {/* Context-Aware Judging */}
      <SettingsRow
        label="Context-Aware Judging"
        description="Pass the grammar explanation to the judging AI for more topic-relevant feedback. Uses API limits faster."
      >
        <PillDropdown
          value={judgeWithExplanation}
          options={['on', 'off'] as const}
          onChange={handleChangeJudgeExplanation}
          formatLabel={(v: 'on' | 'off') => v === 'on' ? 'On' : 'Off'}
        />
      </SettingsRow>

      {/* API Key section */}
      {usageStatus && (
        <View className="mb-6">
          <Text className="text-foreground/80 text-sm font-medium mb-1">API Key</Text>

          {/* Explanation when central key is available */}
          {usageStatus.centralKeyAvailable && (
            <Text className="text-muted-foreground text-xs leading-5 mb-4">
              Some usage is included with your account using the server's API key.
              You can also connect your own Anthropic key if you'd like unlimited usage.
            </Text>
          )}

          {/* Key source toggle */}
          {usageStatus.centralKeyAvailable && (
            <SettingsRow
              label="Key Source"
              description="Which API key to use for AI requests"
            >
              <PillDropdown
                value={usageStatus.preference}
                options={['central', 'own'] as const}
                onChange={handleChangePreference}
                formatLabel={(v: KeyPreference) => v === 'central' ? 'Server Key' : 'My Own Key'}
              />
            </SettingsRow>
          )}

          {/* Server key view */}
          {usageStatus.centralKeyAvailable && usageStatus.preference === 'central' && (
            <View className="mb-3">
              <Text className="text-foreground/60 text-xs font-medium mb-2 uppercase tracking-wide">This Month</Text>
              <UsageBar
                used={usageStatus.usage.central}
                limit={usageStatus.userLimit}
                colors={colors}
              />
              {usageStatus.globalLimitReached && (
                <Text className="text-xs mt-1" style={{ color: colors.destructive }}>
                  Global usage limit reached
                </Text>
              )}
            </View>
          )}

          {/* Personal key view */}
          {(!usageStatus.centralKeyAvailable || usageStatus.preference === 'own') && (
            <View className="mb-3">
              {usageStatus.hasOwnKey && (
                <View className="mb-3">
                  <Text className="text-foreground/60 text-xs font-medium mb-2 uppercase tracking-wide">This Month</Text>
                  <Text className="text-muted-foreground text-xs">
                    Used: {formatCost(usageStatus.usage.own)}
                  </Text>
                </View>
              )}

              {usageStatus.hasOwnKey ? (
                <ConfirmButton
                  label="Delete Personal API Key"
                  confirmLabel="Tap again to delete key"
                  onConfirm={handleDeleteApiKey}
                  destructive
                />
              ) : showAddKey ? (
                <AddApiKeyForm onAdded={handleKeyAdded} />
              ) : (
                <TouchableOpacity
                  className="py-3 rounded-xl border items-center"
                  style={{ borderColor: colors.border }}
                  onPress={() => setShowAddKey(true)}
                  activeOpacity={0.8}
                >
                  <Text className="text-foreground font-semibold">Add Personal API Key</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* Account */}
      <View className="mt-auto gap-3">
        <Text className="text-foreground/80 text-sm font-medium mb-1">Account</Text>
        <ConfirmButton
          label="Log Out"
          confirmLabel="Tap again to log out"
          onConfirm={handleLogout}
          destructive
        />
      </View>
    </PageSheetModal>
  );
}
