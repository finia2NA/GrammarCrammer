import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform, Alert } from 'react-native';
import { useColors } from '@/constants/theme';
import type { Language, CardCount } from '@/constants/session';
import { SharedCreationNameField, SharedCreationOptionsSection } from './DeckModalSharedCreationFields';
import { NeedsConfirmationButton } from '@/components/NeedsConfirmationButton';
import { DatePicker } from '@/components/pickers/DatePicker';
import { formatLocalDateToYmd } from '@/components/pickers/dateUtils';

interface DeckModalCreateTabProps {
  isCollection: boolean;
  isEdit: boolean;
  onDelete?: () => void;
  onExport?: () => void;
  onResetSchedule?: (nodeId: string) => Promise<void>;
  onSetDueDate?: (nodeId: string, dueDate: string) => Promise<void>;
  editNodeId?: string;
  initialDueAt?: number | null;
  name: string;
  onNameChange: (value: string) => void;
  topic: string;
  onTopicChange: (value: string) => void;
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
  onSetDueDate,
  editNodeId,
  initialDueAt,
  name,
  onNameChange,
  topic,
  onTopicChange,
  language,
  onLanguageChange,
  cardCount,
  onCardCountChange,
  enabledLanguages,
}: DeckModalCreateTabProps) {
  const colors = useColors();
  const [dueDate, setDueDate] = useState('');
  const [savingDueDate, setSavingDueDate] = useState(false);

  useEffect(() => {
    if (!initialDueAt) {
      setDueDate('');
      return;
    }
    setDueDate(formatLocalDateToYmd(new Date(initialDueAt)));
  }, [initialDueAt]);

  function showDueDateError(message: string) {
    if (Platform.OS === 'web') {
      window.alert(message);
      return;
    }
    Alert.alert('Invalid date', message);
  }

  async function handleSaveDueDate() {
    if (!editNodeId || !onSetDueDate) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      showDueDateError('Use YYYY-MM-DD format.');
      return;
    }

    setSavingDueDate(true);
    try {
      await onSetDueDate(editNodeId, dueDate);
      if (Platform.OS === 'web') window.alert('Due date updated.');
      else Alert.alert('Saved', 'Due date updated.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not update due date.';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Update failed', message);
    } finally {
      setSavingDueDate(false);
    }
  }

  async function handleResetSchedule() {
    if (!editNodeId || !onResetSchedule) return;
    try {
      await onResetSchedule(editNodeId);
      setDueDate('');
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
        </>
      )}

      {isEdit && !isCollection && editNodeId && (onSetDueDate || onResetSchedule) && (
        <View className="mb-6 gap-3">
          <Text className="text-foreground/80 text-sm font-medium">Review Schedule</Text>
          <Text className="text-foreground-secondary text-xs">
            Set when this deck becomes due, or reset it to never studied.
          </Text>

          <DatePicker
            value={dueDate}
            onChange={setDueDate}
            placeholder="Pick due date"
            disabled={savingDueDate}
          />

          {onSetDueDate && (
            <TouchableOpacity
              className={`py-3.5 rounded-xl items-center ${savingDueDate ? 'bg-background-muted' : 'bg-secondary-light'}`}
              onPress={handleSaveDueDate}
              disabled={savingDueDate || dueDate.trim().length === 0}
              activeOpacity={0.85}
            >
              <Text className="text-secondary-foreground font-semibold">
                {savingDueDate ? 'Saving…' : 'Save Due Date'}
              </Text>
            </TouchableOpacity>
          )}

          {onResetSchedule && (
            <NeedsConfirmationButton
              label="Reset to Never Studied"
              confirmLabel="Tap again to reset"
              onConfirm={() => { void handleResetSchedule(); }}
            />
          )}
        </View>
      )}

      {isEdit && (onExport || onDelete) && (
        <View className="mt-auto flex-row gap-3">
          {onExport && (
            <TouchableOpacity
              className="flex-1 py-3.5 rounded-xl border-secondary-light items-center bg-secondary-light"
              onPress={onExport}
            >
              <Text className="text-secondary-foreground font-semibold">
                Export as CSV
              </Text>
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
