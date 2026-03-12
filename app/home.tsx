import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

const LANGUAGES = [
  'Japanese', 'Spanish', 'French', 'German',
  'Korean', 'Mandarin', 'Italian', 'Portuguese', 'Other',
] as const;
type Language = (typeof LANGUAGES)[number];

const CARD_COUNTS = [5, 10, 15, 20] as const;
type CardCount = (typeof CARD_COUNTS)[number];

// ─── Compact pill dropdown ────────────────────────────────────────────────────

interface PillDropdownProps<T extends string | number> {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  formatLabel?: (v: T) => string;
}

function PillDropdown<T extends string | number>({
  value, options, onChange, formatLabel,
}: PillDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const label = formatLabel ? formatLabel(value) : String(value);

  return (
    <View style={{ position: 'relative' }}>
      <TouchableOpacity
        className="flex-row items-center gap-1.5 bg-slate-800 rounded-lg px-3 py-1.5"
        onPress={() => { Keyboard.dismiss(); setOpen(!open); }}
        activeOpacity={0.8}
      >
        <Text className="text-white text-sm font-medium">{label}</Text>
        <Text className="text-slate-500 text-[10px]">{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View
          className="absolute right-0 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden"
          style={{ top: '100%', marginTop: 4, zIndex: 100, minWidth: 130 }}
        >
          {options.map((opt) => (
            <TouchableOpacity
              key={String(opt)}
              className={`px-4 py-2.5 ${opt === value ? 'bg-indigo-600' : ''}`}
              onPress={() => { onChange(opt); setOpen(false); }}
            >
              <Text className={`text-sm font-medium ${opt === value ? 'text-white' : 'text-slate-300'}`}>
                {formatLabel ? formatLabel(opt) : String(opt)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Home screen ─────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState<Language>('Japanese');
  const [cardCount, setCardCount] = useState<CardCount>(10);

  const canStart = topic.trim().length > 0;

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
      className="flex-1 bg-slate-950"
      bottomOffset={16}
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
      }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View className="w-full max-w-2xl">
        {/* Header */}
        <Text className="text-white text-3xl font-bold mb-8">GrammarCrammer</Text>

        {/* Input card — dropdowns float inside top-right corner */}
        <View
          className="bg-slate-900 border border-slate-700 rounded-2xl mb-4"
          style={{ minHeight: 140, zIndex: 10 }}
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
              formatLabel={(v) => `${v} cards`}
            />
          </View>

          {/* Text input — top padding clears the dropdown row */}
          <TextInput
            className="flex-1 text-white text-base px-5 pb-5"
            style={{ paddingTop: 52, textAlignVertical: 'top', minHeight: 140 }}
            placeholder="What shall we study today"
            placeholderTextColor="#475569"
            value={topic}
            onChangeText={setTopic}
            onSubmitEditing={handleStart}
            returnKeyType="go"
            blurOnSubmit
            multiline
          />
        </View>

        {/* Start button */}
        <TouchableOpacity
          className={`py-4 rounded-2xl items-center ${canStart ? 'bg-indigo-600' : 'bg-slate-800'}`}
          onPress={handleStart}
          disabled={!canStart}
          activeOpacity={0.85}
        >
          <Text className={`text-base font-bold ${canStart ? 'text-white' : 'text-slate-600'}`}>
            Start Session →
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
}
