import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { PageSheetModal } from '@/components/PageSheetModal';
import type { Language, CardCount } from '@/constants/session';
import type { TreeNode } from '@/lib/types';
import type { CsvImportResult } from '@/lib/api';
import { DeckModalCreateTab } from './DeckModalCreateTab';
import { DeckModalCsvTab } from './DeckModalCsvTab';

interface DeckModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: DeckFormData) => void;
  onCsvImport?: (data: CsvImportData) => Promise<CsvImportResult>;
  onDelete?: () => void;
  editNode?: TreeNode | null;
  editNodePath?: string;
}

export interface DeckFormData {
  path: string;
  topic: string;
  language: Language;
  cardCount: CardCount;
}

export interface CsvImportData {
  csvContent: string;
  collectionPath: string;
  language: Language;
  cardCount: CardCount;
}

export type CsvImportStatus =
  | { state: 'idle' }
  | { state: 'importing' }
  | { state: 'error'; message: string }
  | { state: 'done'; result: CsvImportResult };

export function DeckModal({ visible, onClose, onSubmit, onCsvImport, onDelete, editNode, editNodePath }: DeckModalProps) {
  const isEdit = editNode !== null && editNode !== undefined;
  const isCollection = isEdit && editNode.deck === null;
  const canUseCsvTab = !isEdit;

  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState<Language>('Japanese');
  const [cardCount, setCardCount] = useState<CardCount>(10);
  const [activeTab, setActiveTab] = useState<'create' | 'csv'>('create');
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<CsvImportStatus>({ state: 'idle' });

  useEffect(() => {
    if (visible) {
      setActiveTab('create');
      setCsvContent(null);
      setImportStatus({ state: 'idle' });
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

  function handleFileSelected(fileName: string, content: string) {
    setCsvContent(content);
    setImportStatus({ state: 'idle' });
    if (!name.trim()) {
      setName(fileName.replace(/\.[^.]+$/, ''));
    }
  }

  const handleCsvImport = useCallback(async () => {
    if (!csvContent || !onCsvImport || importStatus.state === 'importing') return;
    setImportStatus({ state: 'importing' });
    try {
      const result = await onCsvImport({
        csvContent,
        collectionPath: name.trim(),
        language,
        cardCount,
      });
      if (result.failedCount > 0 && result.createdCount === 0) {
        setImportStatus({ state: 'done', result });
      } else if (result.failedCount > 0) {
        setImportStatus({ state: 'done', result });
      } else {
        setImportStatus({ state: 'idle' });
      }
    } catch (e: any) {
      setImportStatus({ state: 'error', message: e?.message ?? 'Import failed.' });
    }
  }, [csvContent, onCsvImport, importStatus.state, name, language, cardCount]);

  const isImporting = importStatus.state === 'importing';
  const canSubmit = name.trim().length > 0 && (isCollection || topic.trim().length > 0);
  const showingCsvTab = canUseCsvTab && activeTab === 'csv';
  const csvCanImport = showingCsvTab && csvContent !== null && !isImporting;

  const title = showingCsvTab
    ? 'Import CSV'
    : isCollection ? 'Edit Collection' : isEdit ? 'Edit Deck' : 'New Deck';

  const confirmText = showingCsvTab ? (isImporting ? 'Importing…' : 'Import') : isEdit ? 'Save' : 'Create';
  const confirmDisabled = showingCsvTab ? !csvCanImport : !canSubmit;
  const handleConfirm = showingCsvTab ? handleCsvImport : handleSubmit;

  return (
    <PageSheetModal
      visible={visible}
      title={title}
      cancelText="Cancel"
      onCancel={onClose}
      confirmText={confirmText}
      onConfirm={handleConfirm}
      confirmDisabled={confirmDisabled}
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
        <DeckModalCsvTab
          collectionPath={name}
          onCollectionPathChange={setName}
          language={language}
          onLanguageChange={setLanguage}
          cardCount={cardCount}
          onCardCountChange={setCardCount}
          onFileSelected={handleFileSelected}
          importStatus={importStatus}
        />
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
