import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { PageSheetModal } from '@/components/PageSheetModal';
import type { Language, CardCount } from '@/constants/session';
import type { TreeNode } from '@/lib/types';
import { DeckModalCreateTab } from './DeckModalCreateTab';
import { DeckModalCsvTab } from './DeckModalCsvTab';

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
  const isEdit = editNode !== null && editNode !== undefined;
  const isCollection = isEdit && editNode.deck === null;
  const canUseCsvTab = !isEdit;

  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState<Language>('Japanese');
  const [cardCount, setCardCount] = useState<CardCount>(10);
  const [activeTab, setActiveTab] = useState<'create' | 'csv'>('create');

  // Reset form when modal opens / editNode changes
  useEffect(() => {
    if (visible) {
      setActiveTab('create');
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
  const showingCsvTab = canUseCsvTab && activeTab === 'csv';

  const title = showingCsvTab
    ? 'Import CSV'
    : isCollection ? 'Edit Collection' : isEdit ? 'Edit Deck' : 'New Deck';

  const rightAction = showingCsvTab
    ? { label: 'Import', onPress: () => {}, disabled: true }
    : { label: isEdit ? 'Save' : 'Create', onPress: handleSubmit, disabled: !canSubmit };

  return (
    <PageSheetModal
      visible={visible}
      onClose={onClose}
      title={title}
      leftAction={{ label: 'Cancel', onPress: onClose }}
      rightAction={rightAction}
    >
      {canUseCsvTab && (
        <View className="mb-6 p-1 rounded-xl bg-background-muted border border-border flex-row gap-1">
          <TouchableOpacity
            className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === 'create' ? 'bg-surface' : ''}`}
            onPress={() => setActiveTab('create')}
            activeOpacity={0.85}
          >
            <Text className={`text-sm font-semibold ${activeTab === 'create' ? 'text-foreground' : 'text-foreground-secondary'}`}>
              Create Deck
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === 'csv' ? 'bg-surface' : ''}`}
            onPress={() => setActiveTab('csv')}
            activeOpacity={0.85}
          >
            <Text className={`text-sm font-semibold ${activeTab === 'csv' ? 'text-foreground' : 'text-foreground-secondary'}`}>
              Import CSV
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showingCsvTab ? (
        <DeckModalCsvTab />
      ) : (
        <DeckModalCreateTab
          isCollection={isCollection}
          isEdit={isEdit}
          onDelete={onDelete}
          name={name}
          onNameChange={setName}
          topic={topic}
          onTopicChange={setTopic}
          language={language}
          onLanguageChange={setLanguage}
          cardCount={cardCount}
          onCardCountChange={setCardCount}
        />
      )}
    </PageSheetModal>
  );
}
