import { Text, TextInput, View } from 'react-native';
import { PillDropdown } from '@/components/PillDropdown';
import { LANGUAGES, CARD_COUNTS } from '@/constants/session';
import { useColors } from '@/constants/theme';
import type { Language, CardCount } from '@/constants/session';

interface SharedCreationNameFieldProps {
  label: string;
  description: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  autoFocus?: boolean;
}

export function SharedCreationNameField({
  label,
  description,
  placeholder,
  value,
  onChangeText,
  autoFocus,
}: SharedCreationNameFieldProps) {
  const colors = useColors();

  return (
    <>
      <Text className="text-foreground/80 text-sm font-medium mb-2">{label}</Text>
      <Text className="text-foreground-secondary text-xs mb-2">{description}</Text>
      <TextInput
        className="bg-background-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground-muted text-base mb-6"
        placeholder={placeholder}
        placeholderTextColor={colors.foreground_muted}
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
      />
    </>
  );
}

interface SharedCreationOptionsSectionProps {
  language: Language;
  onLanguageChange: (value: Language) => void;
  cardCount: CardCount;
  onCardCountChange: (value: CardCount) => void;
}

export function SharedCreationOptionsSection({
  language,
  onLanguageChange,
  cardCount,
  onCardCountChange,
}: SharedCreationOptionsSectionProps) {
  return (
    <>
      <Text className="text-foreground/80 text-sm font-medium mb-3">Options</Text>
      <View className="flex-row gap-3 mb-6">
        <PillDropdown value={language} options={LANGUAGES} onChange={onLanguageChange} />
        <PillDropdown
          value={cardCount}
          options={CARD_COUNTS}
          onChange={onCardCountChange}
          formatLabel={(v: number) => `${v} cards`}
        />
      </View>
    </>
  );
}
