import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PillDropdown } from '@/components/PillDropdown';
import { ThemedSwitch } from '@/components/ThemedSwitch';
import { UsageBar } from '@/components/home/UsageBar';
import { useColors } from '@/constants/theme';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { formatCost, formatUsagePercent } from '@/lib/format';
import { platformAlert } from '@/lib/platformAlert';
import { getAdminUsers, updateAdminConfig, type AdminTierFilter, type AdminUser } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

const TIER_OPTIONS = ['all', 'free', 'paid'] as const;

function AdminSection({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="bg-surface border border-border rounded-lg p-5 mb-5"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      }}
    >
      {children}
    </View>
  );
}

export default function AdminPanel() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useI18n();
  const canRender = useRequireAdmin();
  const [tier, setTier] = useState<AdminTierFilter>('all');
  const [hasUsage, setHasUsage] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [freeBudget, setFreeBudget] = useState('1.00');
  const [paidBudget, setPaidBudget] = useState('5.00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminUsers({ tier, hasUsage });
      setUsers(result.users);
      setFreeBudget(result.config.free_user_budget ?? String(result.budgets.free ?? 1.00));
      setPaidBudget(result.config.paid_user_budget ?? String(result.budgets.paid ?? 5.00));
    } catch (e) {
      const message = e instanceof Error ? e.message : t('common.errorGeneric');
      platformAlert(t('common.apiError'), message);
    } finally {
      setLoading(false);
    }
  }, [hasUsage, t, tier]);

  useEffect(() => {
    loadUsers().catch(() => {});
  }, [loadUsers]);

  async function handleSaveBudgets() {
    setSaving(true);
    try {
      await updateAdminConfig({
        free_user_budget: freeBudget.trim(),
        paid_user_budget: paidBudget.trim(),
      });
      await loadUsers();
      platformAlert(t('admin.budgetsSaved'), t('admin.budgetsSaved'));
    } catch (e) {
      const message = e instanceof Error ? e.message : t('admin.budgetSaveFailed');
      platformAlert(t('admin.budgetSaveFailed'), message);
    } finally {
      setSaving(false);
    }
  }

  function tierLabel(value: AdminTierFilter | 'free' | 'paid') {
    if (value === 'free') return t('admin.filterFree');
    if (value === 'paid') return t('admin.filterPaid');
    return t('admin.filterAll');
  }

  function renderUser({ item }: { item: AdminUser }) {
    const centralUsage = formatCost(item.usage.central);
    const budget = formatCost(item.budget);
    const ownUsage = item.usage.own > 0 ? formatCost(item.usage.own) : null;
    return (
      <View className="bg-surface border border-border rounded-lg p-4 mb-3">
        <View className="flex-row items-start justify-between gap-3 mb-3">
          <View className="flex-1">
            <Text className="text-foreground text-sm font-semibold" numberOfLines={1}>
              {item.email ?? t('admin.noEmail')}
            </Text>
            <Text className="text-foreground-muted text-xs mt-1" numberOfLines={1}>
              {item.id}
            </Text>
          </View>
          <View className="rounded-full px-3 py-1" style={{ backgroundColor: colors.badge_warning }}>
            <Text className="text-foreground-secondary text-xs font-semibold">{tierLabel(item.tier)}</Text>
          </View>
        </View>
        <View className="flex-row items-end justify-between mb-1">
          <Text className="text-foreground-secondary text-xs">
            {centralUsage} / {budget}
          </Text>
          <Text className="text-foreground text-sm font-semibold">
            {formatUsagePercent(item.usage.central, item.budget)}
          </Text>
        </View>
        <UsageBar used={item.usage.central} limit={item.budget} showLabel={false} />
        {ownUsage && (
          <Text className="text-foreground-muted text-xs mt-2">
            {t('settings.used', { amount: ownUsage })}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {!canRender ? (
        <View className="flex-1" />
      ) : (
        <>
          <View className="px-5 pt-5 pb-4 border-b border-border bg-surface">
            <View className="w-full self-center flex-row items-center justify-between" style={{ maxWidth: 1180 }}>
              <View className="flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-4 py-2 px-1" activeOpacity={0.75}>
                  <Text className="text-primary font-semibold">{t('common.back')}</Text>
                </TouchableOpacity>
                <Text className="text-foreground text-2xl font-bold">{t('admin.title')}</Text>
              </View>
              <Text className="text-foreground-secondary text-sm">{t('admin.userCount', { count: users.length })}</Text>
            </View>
          </View>

          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={renderUser}
            contentContainerStyle={{
              alignSelf: 'center',
              width: '100%',
              maxWidth: 1180,
              padding: 20,
              paddingBottom: insets.bottom + 32,
            }}
            ListHeaderComponent={(
              <View>
                <AdminSection>
                  <Text className="text-foreground/50 text-xs font-semibold uppercase tracking-widest mb-4">
                    {t('admin.budgetSettings')}
                  </Text>
                  <View className="flex-row gap-3 mb-4">
                    <View className="flex-1">
                      <Text className="text-foreground-secondary text-xs font-semibold mb-2">{t('admin.freeBudget')}</Text>
                      <TextInput
                        value={freeBudget}
                        onChangeText={setFreeBudget}
                        keyboardType="decimal-pad"
                        className="rounded-lg bg-background-muted px-4 py-3 text-foreground text-base font-semibold"
                        placeholderTextColor={colors.mutedForeground}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-foreground-secondary text-xs font-semibold mb-2">{t('admin.paidBudget')}</Text>
                      <TextInput
                        value={paidBudget}
                        onChangeText={setPaidBudget}
                        keyboardType="decimal-pad"
                        className="rounded-lg bg-background-muted px-4 py-3 text-foreground text-base font-semibold"
                        placeholderTextColor={colors.mutedForeground}
                      />
                    </View>
                  </View>
                  <TouchableOpacity
                    className="py-3 rounded-lg items-center bg-primary"
                    onPress={handleSaveBudgets}
                    disabled={saving}
                    activeOpacity={0.8}
                  >
                    <Text className="text-primary-foreground font-semibold">
                      {saving ? t('common.saving') : t('admin.saveBudgets')}
                    </Text>
                  </TouchableOpacity>
                </AdminSection>

                <AdminSection>
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-foreground/50 text-xs font-semibold uppercase tracking-widest">
                      {t('admin.users')}
                    </Text>
                    {loading && <ActivityIndicator color={colors.primary} />}
                  </View>
                  <View className="flex-row items-center justify-between gap-4">
                    <View className="flex-row items-center gap-3">
                      <Text className="text-foreground-secondary text-sm font-medium">{t('admin.tier')}</Text>
                      <PillDropdown value={tier} options={TIER_OPTIONS} onChange={setTier} formatLabel={tierLabel} />
                    </View>
                    <View className="flex-row items-center gap-3">
                      <Text className="text-foreground-secondary text-sm font-medium">{t('admin.hasUsageThisMonth')}</Text>
                      <ThemedSwitch value={hasUsage} onValueChange={setHasUsage} />
                    </View>
                  </View>
                </AdminSection>
              </View>
            )}
            ListEmptyComponent={loading ? (
              <View className="py-8">
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null}
          />
        </>
      )}
    </View>
  );
}
