import { View, Text, TextInput, TouchableOpacity, Platform, Alert } from 'react-native';
import { useColors } from '@/constants/theme';
import type { Language, CardCount } from '@/constants/session';
import { SharedCreationNameField, SharedCreationOptionsSection } from './DeckModalSharedCreationFields';
import { NeedsConfirmationButton } from '@/components/NeedsConfirmationButton';
import { DatePicker } from '@/components/pickers/DatePicker';

interface DeckModalCreateTabProps {
  isCollection: boolean;
  isEdit: boolean;
  onDelete?: () => void;
  onExport?: () => void;
  onResetSchedule?: (nodeId: string) => Promise<void>;
  editNodeId?: string;
  dueDate: string;
  onDueDateChange: (value: string) => void;
  name: string;
  onNameChange: (value: string) => void;
  topic: string;
  onTopicChange: (value: string) => void;
  explanation: string;
  onExplanationChange: (value: string) => void;
  showExplanationField: boolean;
  language: Language;
  onLanguageChange: (value: Language) => void;
  cardCount: CardCount;
  onCardCountChange: (value: CardCount) => void;
  enabledLanguages: string[];
}

export function DeckModalCreateTab({
  isCollection,
  isEdit,
  onDelete,
  onExport,
  onResetSchedule,
  editNodeId,
  dueDate,
  onDueDateChange,
  name,
  onNameChange,
  topic,
  onTopicChange,
  explanation,
  onExplanationChange,
  showExplanationField,
  language,
  onLanguageChange,
  cardCount,
  onCardCountChange,
  enabledLanguages,
}: DeckModalCreateTabProps) {
  const colors = useColors();

  async function handleResetSchedule() {
    if (!editNodeId || !onResetSchedule) return;
    try {
      await onResetSchedule(editNodeId);
      onDueDateChange('');
      if (Platform.OS === 'web') window.alert('Deck reset to never studied.');
      else Alert.alert('Reset complete', 'Deck reset to never studied.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not reset deck.';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Reset failed', message);
    }
  }

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
            enabledLanguages={enabledLanguages}
          />

          {showExplanationField && (
            <>
              <Text className="text-foreground/80 text-sm font-medium mb-2">Explanation</Text>
              <Text className="text-foreground-secondary text-xs mb-2">
                Markdown saved with this deck.
              </Text>
              <TextInput
                className="bg-background-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground-muted text-sm mb-6"
                placeholder="Generated explanation"
                placeholderTextColor={colors.foreground_muted}
                value={explanation}
                onChangeText={onExplanationChange}
                multiline
                style={{ minHeight: 160, textAlignVertical: 'top' }}
              />
            </>
          )}
        </>
      )}

      {isEdit && !isCollection && editNodeId && (
        <View className="mb-6 gap-3">
          <Text className="text-foreground/80 text-sm font-medium">Review Schedule</Text>
          <Text className="text-foreground-secondary text-xs">
            Set when this deck becomes due.
          </Text>

          <DatePicker
            value={dueDate}
            onChange={onDueDateChange}
            placeholder="Pick due date"
            popoverPlacement="above"
            popoverTitle="Due Date"
            popoverFooter={onResetSchedule ? (
              <NeedsConfirmationButton
                label="Reset to Never Studied"
                confirmLabel="Tap again to reset"
                onConfirm={() => { void handleResetSchedule(); }}
                destructive
              />
            ) : undefined}
          />
        </View>
      )}

      {isEdit && (onExport || onDelete) && (
        <View className="mt-auto flex-row gap-3">
          {onExport && (
            <TouchableOpacity
              className="flex-1 py-3.5 rounded-xl border-secondary items-center bg-secondary"
              onPress={onExport}
            >
              <Text className="text-secondary-foreground font-semibold">Export as CSV</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <View className="flex-1">
              <NeedsConfirmationButton
                label={`Delete ${isCollection ? 'Collection' : 'Deck'}`}
                confirmLabel="Tap again to delete"
                onConfirm={onDelete}
                destructive
              />
            </View>
          )}
        </View>
      )}
    </>
  );
}
