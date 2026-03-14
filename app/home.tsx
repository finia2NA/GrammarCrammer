import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { PillDropdown } from '@/components/PillDropdown';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LANGUAGES, CARD_COUNTS } from '@/constants/session';
import type { Language, CardCount } from '@/constants/session';
import { useColors } from '@/constants/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCardCount = (v: number) => `${v} cards`;

// ─── Home screen ─────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState<Language>('Japanese');
  const [cardCount, setCardCount] = useState<CardCount>(10);

  const colors = useColors();
  const [inputFocused, setInputFocused] = useState(false);
  const canStart = topic.trim().length > 0;

  const contentContainerStyle = useMemo(() => ({
    flexGrow: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 24,
    paddingTop: insets.top + 24,
    paddingBottom: insets.bottom + 24,
  }), [insets.top, insets.bottom]);

  function handleStart() {
    const trimmed = topic.trim();
    if (!trimmed) return;
    router.push({
      pathname: '/session',
      params: { topic: trimmed, language, count: String(cardCount) },
    });
  }

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      bottomOffset={16}
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View className="w-full max-w-2xl">
        {/* Header */}
        <Text className="text-foreground text-3xl font-bold mb-8">GrammarCrammer</Text>

        {/* Input card — dropdowns float inside top-right corner */}
        <View
          className="bg-card rounded-2xl mb-4"
          style={{
            minHeight: 140,
            zIndex: 10,
            borderWidth: 1,
            borderColor: inputFocused ? colors.primary : colors.border,
            ...Platform.select({ web: inputFocused ? { boxShadow: `0 0 0 3px ${colors.primary}40` } : {} }),
          }}
        >
          {/* Pill dropdowns — absolutely positioned top-right */}
          <View
            className="absolute flex-row gap-2"
            style={{ top: 12, right: 12, zIndex: 20 }}
          >
            <PillDropdown value={language} options={LANGUAGES} onChange={setLanguage} />
            <PillDropdown
              value={cardCount}
              options={CARD_COUNTS}
              onChange={setCardCount}
              formatLabel={formatCardCount}
            />
          </View>

          {/* Text input — top padding clears the dropdown row */}
          <TextInput
            className="flex-1 text-foreground text-base px-5 pb-5 focus:ring-0 focus:outline-none"
            style={{ paddingTop: 52, textAlignVertical: 'top', minHeight: 140 }}
            placeholder="What shall we study today"
            placeholderTextColor={colors.border}
            value={topic}
            onChangeText={setTopic}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onSubmitEditing={handleStart}
            returnKeyType="go"
            blurOnSubmit
            multiline
          />
        </View>

        {/* Start button */}
        <TouchableOpacity
          className={`py-4 rounded-2xl items-center ${canStart ? 'bg-primary' : 'bg-input'}`}
          onPress={handleStart}
          disabled={!canStart}
          activeOpacity={0.85}
          accessibilityLabel="Start study session"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canStart }}
        >
          <Text className={`text-base font-bold ${canStart ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
            Start Session →
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
}
