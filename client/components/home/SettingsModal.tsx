import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useColors } from '@/constants/theme';
import { NeedsConfirmationButton } from '@/components/NeedsConfirmationButton';
import { useRouter } from 'expo-router';
import { clearAuthToken } from '@/lib/storage';
import { getSetting, setSetting, deleteApiKey, setApiKey, validateApiKey, getUsageStatus, getEnabledLanguages, setEnabledLanguages } from '@/lib/api';
import type { UsageStatus } from '@/lib/api';
import { PillDropdown } from '@/components/PillDropdown';
import { CARD_COUNTS, DEFAULT_LANGUAGES } from '@/constants/session';
import type { CardCount } from '@/constants/session';
import { LanguagePicker } from '@/components/home/LanguagePicker';
import { PageSheetModal } from '@/components/PageSheetModal';
import { AnimatedCollapsible } from '@/components/AnimatedCollapsible';

type CardOrder = 'sequential' | 'shuffled';

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="text-foreground/50 text-xs font-semibold uppercase tracking-widest mb-2 px-1">
        {title}
      </Text>
      <View className="h-px bg-border mb-4" />
      <View className="px-1">
        {children}
      </View>
    </View>
  );
}

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
    <View style={{ zIndex: 10 }} className="flex-row items-center justify-between mb-4">
      <View className="flex-1 mr-4">
        <Text className="text-foreground/80 text-sm font-medium">{label}</Text>
        {description && (
          <Text className="text-foreground-secondary text-xs mt-1">{description}</Text>
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

const ConfirmButton = NeedsConfirmationButton;

type KeyPreference = 'central' | 'own';

function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function UsageBar({ used, limit, colors }: { used: number; limit: number; colors: ReturnType<typeof useColors> }) {
  const pct = limit > 0 ? Math.min(used / limit, 1) : 0;
  const barColor = pct >= 0.9 ? colors.error : colors.primary;

  return (
    <View className="mt-2">
      <View className="flex-row justify-between mb-1">
        <Text className="text-foreground-secondary text-xs">
          {formatCost(used)} / {formatCost(limit)}
        </Text>
        <Text className="text-foreground-secondary text-xs">
          {(pct * 100).toFixed(0)}%
        </Text>
      </View>
      <View className="h-2 rounded-full bg-background-muted overflow-hidden">
        <View
          style={{ width: `${pct * 100}%`, backgroundColor: barColor }}
          className="h-full rounded-full"
        />
      </View>
    </View>
  );
}

function AddApiKeyForm({ onAdded }: { onAdded: () => void }) {
  const colors = useColors();
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
        className="bg-background-muted text-foreground placeholder:text-foreground-muted rounded-lg px-3 py-2 text-sm border border-border"
        placeholder="sk-ant-..."
        placeholderTextColor={colors.foreground_muted}
        value={key}
        onChangeText={setKey}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />
      {error ? <Text className="text-xs" style={{ color: '#f87171' }}>{error}</Text> : null}
      <TouchableOpacity
        className="bg-secondary rounded-lg py-2 items-center"
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
  const [feedbackBrevity, setFeedbackBrevity] = useState<'brief' | 'normal'>('normal');
  const [defaultCardCount, setDefaultCardCount] = useState<CardCount>(10);
  const [enabledLanguages, setEnabledLanguagesState] = useState<string[]>(DEFAULT_LANGUAGES);
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [showAddKey, setShowAddKey] = useState(false);
  const [languagesExpanded, setLanguagesExpanded] = useState(false);

  useEffect(() => {
    if (visible) {
      getSetting('card_order').then(v => {
        if (v === 'sequential' || v === 'shuffled') setCardOrder(v);
      });
      getSetting('judge_with_explanation').then(v => {
        if (v === 'on' || v === 'off') setJudgeWithExplanation(v);
      });
      getSetting('feedback_brevity').then(v => {
        if (v === 'brief' || v === 'normal') setFeedbackBrevity(v);
      });
      getSetting('default_card_count').then(v => {
        const n = v ? parseInt(v, 10) : 10;
        if (CARD_COUNTS.includes(n as CardCount) && n !== 0) setDefaultCardCount(n as CardCount);
      });
      getEnabledLanguages(DEFAULT_LANGUAGES).then(setEnabledLanguagesState);
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

  function handleChangeFeedbackBrevity(next: 'brief' | 'normal') {
    setFeedbackBrevity(next);
    setSetting('feedback_brevity', next);
  }

  function handleChangeDefaultCardCount(next: CardCount) {
    setDefaultCardCount(next);
    setSetting('default_card_count', String(next));
  }

  function handleChangeEnabledLanguages(next: string[]) {
    setEnabledLanguagesState(next);
    setEnabledLanguages(next);
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
      title="Settings"
      cancelText="Cancel"
      onCancel={onClose}
      confirmText="Done"
      onConfirm={onClose}
    >
      {/* Study Settings */}
      <SectionCard title="Study Settings">
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
        <SettingsRow
          label="Feedback Brevity"
          description="Brief shows a few-word hint. Normal gives a fuller explanation."
        >
          <PillDropdown
            value={feedbackBrevity}
            options={['normal', 'brief'] as const}
            onChange={handleChangeFeedbackBrevity}
            formatLabel={(v: 'brief' | 'normal') => v === 'brief' ? 'Brief' : 'Normal'}
          />
        </SettingsRow>
        <SettingsRow
          label="Default Cards per Topic"
          description="How many cards to generate per deck by default"
        >
          <PillDropdown
            value={defaultCardCount}
            options={[5, 10, 15, 20] as const}
            onChange={handleChangeDefaultCardCount}
            formatLabel={(v: number) => `${v} cards`}
          />
        </SettingsRow>
      </SectionCard>

      {/* Languages */}
      <View className="mb-5">
        <Text className="text-foreground/50 text-xs font-semibold uppercase tracking-widest mb-2 px-1">
          Languages
        </Text>
        <View className="h-px bg-border mb-4" />
        <View className="px-1">
          <TouchableOpacity
            onPress={() => setLanguagesExpanded(e => !e)}
            activeOpacity={0.85}
            className="flex-row items-center justify-between mb-2"
          >
            <Text className="text-foreground text-sm font-medium">
              {languagesExpanded ? 'Hide Languages' : 'Show languages'}
            </Text>
            <Text className="text-foreground-secondary text-sm">{languagesExpanded ? '▼' : '▶'}</Text>
          </TouchableOpacity>
          <AnimatedCollapsible expanded={languagesExpanded} keepMounted={false}>
            <View className="pb-2">
              <Text className="text-foreground-secondary text-xs mb-4">
                Choose which languages appear in the language picker when creating decks.
              </Text>
              <LanguagePicker enabled={enabledLanguages} onChange={handleChangeEnabledLanguages} />
            </View>
          </AnimatedCollapsible>
        </View>
      </View>

      {/* API & Usage */}
      {usageStatus && (
        <SectionCard title="API & Usage">
          {usageStatus.centralKeyAvailable && (
            <Text className="text-foreground-secondary text-xs leading-5 mb-4">
              Some usage is included with your account using the server&apos;s API key.
              You can also connect your own Anthropic key if you&apos;d like unlimited usage.
            </Text>
          )}
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
          {usageStatus.centralKeyAvailable && usageStatus.preference === 'central' && (
            <View className="mb-4">
              <Text className="text-foreground/60 text-xs font-medium mb-2 uppercase tracking-wide">This Month</Text>
              <UsageBar
                used={usageStatus.usage.central}
                limit={usageStatus.userLimit}
                colors={colors}
              />
              {usageStatus.globalLimitReached && (
                <Text className="text-xs mt-1" style={{ color: colors.error }}>
                  Global usage limit reached
                </Text>
              )}
            </View>
          )}
          {(!usageStatus.centralKeyAvailable || usageStatus.preference === 'own') && (
            <View className="mb-4">
              {usageStatus.hasOwnKey && (
                <View className="mb-3">
                  <Text className="text-foreground/60 text-xs font-medium mb-2 uppercase tracking-wide">This Month</Text>
                  <Text className="text-foreground-secondary text-xs">
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
        </SectionCard>
      )}

      {/* Account */}
      <SectionCard title="Account">
        <View className="mb-4">
          <ConfirmButton
            label="Log Out"
            confirmLabel="Tap again to log out"
            onConfirm={handleLogout}
            destructive
          />
        </View>
      </SectionCard>
    </PageSheetModal>
  );
}
