import { Text, TextInput, TouchableOpacity } from 'react-native';
import { useColors } from '@/constants/theme';
import type { Language, CardCount } from '@/constants/session';
import { SharedCreationNameField, SharedCreationOptionsSection } from './DeckModalSharedCreationFields';

interface DeckModalCreateTabProps {
  isCollection: boolean;
  isEdit: boolean;
  onDelete?: () => void;
  name: string;
  onNameChange: (value: string) => void;
  topic: string;
  onTopicChange: (value: string) => void;
  language: Language;
  onLanguageChange: (value: Language) => void;
  cardCount: CardCount;
  onCardCountChange: (value: CardCount) => void;
}

export function DeckModalCreateTab({
  isCollection,
  isEdit,
  onDelete,
  name,
  onNameChange,
  topic,
  onTopicChange,
  language,
  onLanguageChange,
  cardCount,
  onCardCountChange,
}: DeckModalCreateTabProps) {
  const colors = useColors();

  return (
    <>
      <SharedCreationNameField
        label={isCollection ? 'Collection Name' : 'Deck Name'}
        description={isCollection
          ? 'Rename this collection.'
          : 'Use :: to nest in collections, e.g. "Japanese::N5::Te-form"'}
        placeholder={isCollection ? 'Collection name' : 'Japanese::N5::Te-form'}
        value={name}
        onChangeText={onNameChange}
        autoFocus
      />

      {!isCollection && (
        <>
          <Text className="text-foreground/80 text-sm font-medium mb-2">Topic / Prompt</Text>
          <Text className="text-foreground-secondary text-xs mb-2">
            Describe the grammar topic to study. This is sent to Claude to generate the explanation.
          </Text>
          <TextInput
            className="bg-background-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground-muted text-base mb-6"
            placeholder='e.g. "Japanese て-form conjugation"'
            placeholderTextColor={colors.foreground_muted}
            value={topic}
            onChangeText={onTopicChange}
            multiline
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />

          <SharedCreationOptionsSection
            language={language}
            onLanguageChange={onLanguageChange}
            cardCount={cardCount}
            onCardCountChange={onCardCountChange}
          />
        </>
      )}

      {isEdit && onDelete && (
        <TouchableOpacity
          className="mt-auto py-3.5 rounded-xl border border-error items-center"
          onPress={onDelete}
        >
          <Text className="text-error font-semibold">
            Delete {isCollection ? 'Collection' : 'Deck'}
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
}
