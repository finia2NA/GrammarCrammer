import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PillDropdown } from '@/components/PillDropdown';
import { LANGUAGES, CARD_COUNTS } from '@/constants/session';
import { useColors } from '@/constants/theme';
import type { Language, CardCount } from '@/constants/session';
import type { TreeNode } from '@/lib/types';

interface DeckModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: DeckFormData) => void;
  onDelete?: () => void;
  editNode?: TreeNode | null;
  /** Full :: path for the edit node, fetched by the parent. */
  editNodePath?: string;
}

export interface DeckFormData {
  path: string;
  topic: string;
  language: Language;
  cardCount: CardCount;
}

export function DeckModal({ visible, onClose, onSubmit, onDelete, editNode, editNodePath }: DeckModalProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const isEdit = editNode !== null && editNode !== undefined;
  const isCollection = isEdit && editNode.deck === null;

  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState<Language>('Japanese');
  const [cardCount, setCardCount] = useState<CardCount>(10);

  // Reset form when modal opens / editNode changes
  useEffect(() => {
    if (visible) {
      if (isEdit && editNode) {
        setName(editNodePath ?? editNode.name);
        if (editNode.deck) {
          setTopic(editNode.deck.topic);
          setLanguage(editNode.deck.language as Language);
          setCardCount(editNode.deck.cardCount as CardCount);
        }
      } else {
        setName('');
        setTopic('');
        setLanguage('Japanese');
        setCardCount(10);
      }
    }
  }, [visible, editNode, editNodePath, isEdit]);

  function handleSubmit() {
    const trimmedName = name.trim();
    const trimmedTopic = topic.trim();
    if (!trimmedName) return;
    if (!isCollection && !trimmedTopic) return;

    onSubmit({
      path: trimmedName,
      topic: trimmedTopic,
      language,
      cardCount,
    });
  }

  const canSubmit = name.trim().length > 0 && (isCollection || topic.trim().length > 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-8">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-primary text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-foreground text-lg font-bold">
              {isCollection ? 'Edit Collection' : isEdit ? 'Edit Deck' : 'New Deck'}
            </Text>
            <TouchableOpacity onPress={handleSubmit} disabled={!canSubmit}>
              <Text className={`text-base font-semibold ${canSubmit ? 'text-primary' : 'text-muted-foreground'}`}>
                {isEdit ? 'Save' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Name */}
          <Text className="text-foreground/80 text-sm font-medium mb-2">
            {isCollection ? 'Collection Name' : 'Deck Name'}
          </Text>
          <Text className="text-muted-foreground text-xs mb-2">
            {isCollection
              ? 'Rename this collection.'
              : 'Use :: to nest in collections, e.g. "Japanese::N5::Te-form"'}
          </Text>
          <TextInput
            className="bg-input border border-border rounded-xl px-4 py-3 text-foreground text-base mb-6"
            placeholder={isCollection ? 'Collection name' : 'Japanese::N5::Te-form'}
            placeholderTextColor={colors.border}
            value={name}
            onChangeText={setName}
            autoFocus
          />

          {/* Deck-specific fields */}
          {!isCollection && (
            <>
              <Text className="text-foreground/80 text-sm font-medium mb-2">Topic / Prompt</Text>
              <Text className="text-muted-foreground text-xs mb-2">
                Describe the grammar topic to study. This is sent to Claude to generate the explanation.
              </Text>
              <TextInput
                className="bg-input border border-border rounded-xl px-4 py-3 text-foreground text-base mb-6"
                placeholder='e.g. "Japanese て-form conjugation"'
                placeholderTextColor={colors.border}
                value={topic}
                onChangeText={setTopic}
                multiline
                style={{ minHeight: 80, textAlignVertical: 'top' }}
              />

              <Text className="text-foreground/80 text-sm font-medium mb-3">Options</Text>
              <View className="flex-row gap-3 mb-6">
                <PillDropdown value={language} options={LANGUAGES} onChange={setLanguage} />
                <PillDropdown
                  value={cardCount}
                  options={CARD_COUNTS}
                  onChange={setCardCount}
                  formatLabel={(v: number) => `${v} cards`}
                />
              </View>
            </>
          )}

          {/* Delete button (edit mode only) */}
          {isEdit && onDelete && (
            <TouchableOpacity
              className="mt-auto py-3.5 rounded-xl border border-destructive items-center"
              onPress={onDelete}
            >
              <Text className="text-destructive font-semibold">
                Delete {isCollection ? 'Collection' : 'Deck'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
