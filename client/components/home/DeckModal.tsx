import { useState, useEffect, useCallback } from 'react';
import { Alert, ActivityIndicator, Platform, View, Text } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { PageSheetModal } from '@/components/PageSheetModal';
import { AnimatedTabbed } from '@/components/AnimatedTabbed';
import type { Language, CardCount } from '@/constants/session';
import { DEFAULT_LANGUAGES } from '@/constants/session';
import type { TreeNode } from '@/lib/types';
import type { JsonImportResult, GrammarCaseSummary } from '@/lib/api';
import { exportNodeJson, getNodePath, getDeck, getGrammarCases } from '@/lib/api';
import { DeckModalCreateTab } from './DeckModalCreateTab';
import { DeckModalJsonTab } from './DeckModalJsonTab';
import { useColors } from '@/constants/theme';
import { useEnabledLanguages } from '@/hooks/state/persistent/useSettings';
import { useI18n } from '@/lib/i18n';

async function triggerJsonDownload(filename: string, json: string) {
  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  const fileUri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ''}${filename}`;
  if (!fileUri) {
    throw new Error('Could not prepare a file for export.');
  }

  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Export JSON',
    UTI: 'public.json',
  });
}

interface DeckModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: DeckFormData) => void | Promise<void>;
  onJsonImport?: (data: JsonImportData) => Promise<JsonImportResult>;
  onDelete?: () => void;
  onEditDataLoaded?: (path: string) => void;
  editNode?: TreeNode | null;
  editNodePath?: string;
  initialData?: Partial<DeckFormData>;
}

export interface DeckFormData {
  path: string;
  topic: string;
  clarification: string;
  language: Language;
  cardCount: CardCount;
  explanation?: string;
  regenerateGrammarCases?: boolean;
}

export interface JsonImportData {
  jsonContent: string;
  collectionPath: string;
  language: Language;
  cardCount: CardCount;
}

export type JsonImportStatus =
  | { state: 'idle' }
  | { state: 'importing' }
  | { state: 'error'; message: string }
  | { state: 'done'; result: JsonImportResult };

export function DeckModal({
  visible,
  onClose,
  onSubmit,
  onJsonImport,
  onDelete,
  onEditDataLoaded,
  editNode,
  editNodePath,
  initialData,
}: DeckModalProps) {
  const colors = useColors();
  const { t } = useI18n();
  const isEdit = editNode !== null && editNode !== undefined;
  const isCollection = isEdit && editNode.deck === null;
  const canUseJsonTab = !isEdit;
  const enabledLanguages = useEnabledLanguages(DEFAULT_LANGUAGES);

  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [clarification, setClarification] = useState('');
  const [language, setLanguage] = useState<Language>('Japanese');
  const [cardCount, setCardCount] = useState<CardCount>(0);
  const [explanation, setExplanation] = useState('');
  const [originalExplanation, setOriginalExplanation] = useState('');
  const [grammarCases, setGrammarCases] = useState<GrammarCaseSummary[]>([]);
  const [regenerateGrammarCases, setRegenerateGrammarCases] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'json'>('create');
  const [jsonContent, setJsonContent] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<JsonImportStatus>({ state: 'idle' });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && isEdit && editNode) {
      setLoading(true);
      setActiveTab('create');
      setJsonContent(null);
      setImportStatus({ state: 'idle' });
      setGrammarCases([]);
      setRegenerateGrammarCases(false);

      const node = editNode;
      const pathProp = editNodePath;

      async function loadEditData() {
        try {
          const path = await getNodePath(node.id);
          if (onEditDataLoaded) onEditDataLoaded(path);
          setName(path);

          if (node.deck) {
            const deck = await getDeck(node.id);
            setTopic(deck.topic);
            setClarification(deck.clarification ?? '');
            setLanguage(deck.language as Language);
            setCardCount(deck.cardCount as CardCount);
            setExplanation(deck.explanation ?? '');
            setOriginalExplanation(deck.explanation ?? '');
            if (deck.explanation) {
              const result = await getGrammarCases(node.id, { sort: 'order' });
              setGrammarCases(result.cases);
            }
          } else {
            setTopic('');
            setClarification('');
            setExplanation('');
            setGrammarCases([]);
          }
        } catch {
          setName(pathProp ?? node.name);
          if (node.deck) {
            setTopic(node.deck.topic);
            setClarification(node.deck.clarification ?? '');
            setLanguage(node.deck.language as Language);
            setCardCount(node.deck.cardCount as CardCount);
            setExplanation(node.deck.explanation ?? '');
          }
          setGrammarCases([]);
        } finally {
          setLoading(false);
        }
      }

      loadEditData();
    } else if (visible) {
      setActiveTab('create');
      setJsonContent(null);
      setImportStatus({ state: 'idle' });
      setGrammarCases([]);
      setRegenerateGrammarCases(false);
      setName(initialData?.path ?? '');
      setTopic(initialData?.topic ?? '');
      setClarification(initialData?.clarification ?? '');
      setLanguage(initialData?.language ?? 'Japanese');
      setCardCount(initialData?.cardCount ?? 0);
      setExplanation(initialData?.explanation ?? '');
      setOriginalExplanation(initialData?.explanation ?? '');
    }
  }, [visible, editNode, editNodePath, isEdit, onEditDataLoaded, initialData]);

  useEffect(() => {
    if (!visible) return;
    setLanguage((prev: string) => enabledLanguages.includes(prev) ? prev : enabledLanguages[0] ?? DEFAULT_LANGUAGES[0]);
  }, [visible, enabledLanguages]);

  async function submitDeckForm() {
    const trimmedName = name.trim();
    const trimmedTopic = topic.trim();
    if (!trimmedName) return;
    if (!isCollection && !trimmedTopic) return;

    setSubmitting(true);
    try {
      await onSubmit({
        path: trimmedName,
        topic: trimmedTopic,
        clarification,
        language,
        cardCount,
        explanation,
        regenerateGrammarCases,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : t('common.errorGeneric');
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert(t('deck.saveFailed'), message);
    } finally {
      setSubmitting(false);
    }
  }

  const promptChanged = isEdit && !isCollection && !!editNode?.deck && (
    topic.trim() !== editNode.deck.topic.trim() ||
    clarification.trim() !== (editNode.deck.clarification ?? '').trim()
  );
  const explanationChanged = isEdit && !isCollection && explanation !== originalExplanation;

  function handleSubmit() {
    void submitDeckForm();
  }

  function handleFileSelected(fileName: string, content: string) {
    setJsonContent(content);
    setImportStatus({ state: 'idle' });
    if (!name.trim()) {
      const rawName = fileName.replace(/\.[^.]+$/, '');
      setName(rawName.replace(/__/g, '::'));
    }
  }

  const handleExport = useCallback(async () => {
    if (!editNode) return;
    try {
      const { filename, json } = await exportNodeJson(editNode.id);
      await triggerJsonDownload(filename, json);
    } catch (e: any) {
      Alert.alert(t('deck.exportFailed'), e?.message ?? t('deck.unknownError'));
    }
  }, [editNode, t]);

  const handleJsonImport = useCallback(async () => {
    if (!jsonContent || !onJsonImport || importStatus.state === 'importing') return;
    setImportStatus({ state: 'importing' });
    try {
      const result = await onJsonImport({
        jsonContent,
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
      setImportStatus({ state: 'error', message: e?.message ?? t('deck.importFailed') });
    }
  }, [jsonContent, onJsonImport, importStatus.state, name, language, cardCount, t]);

  const isImporting = importStatus.state === 'importing';
  const canSubmit = name.trim().length > 0 && (isCollection || topic.trim().length > 0);
  const showingJsonTab = canUseJsonTab && activeTab === 'json';
  const jsonCanImport = showingJsonTab && jsonContent !== null && !isImporting;

  const title = showingJsonTab
    ? t('deck.importJson')
    : isCollection ? t('deck.editCollection') : isEdit ? t('deck.editDeck') : t('deck.newDeck');

  const confirmText = showingJsonTab
    ? (isImporting ? t('common.importing') : t('common.import'))
    : submitting
      ? t('common.saving')
      : isEdit
        ? t('common.save')
        : t('common.create');
  const confirmDisabled = showingJsonTab ? !jsonCanImport : !canSubmit || submitting;
  const handleConfirm = showingJsonTab ? handleJsonImport : handleSubmit;

  const tabContent = activeTab === 'json' ? (
    <DeckModalJsonTab
      collectionPath={name}
      onCollectionPathChange={setName}
      language={language}
      onLanguageChange={setLanguage}
      cardCount={cardCount}
      onCardCountChange={setCardCount}
      onFileSelected={handleFileSelected}
      importStatus={importStatus}
      enabledLanguages={enabledLanguages}
    />
  ) : (
    <DeckModalCreateTab
      isCollection={isCollection}
      isEdit={isEdit}
      onDelete={onDelete}
      onExport={isEdit ? handleExport : undefined}
      name={name}
      onNameChange={setName}
      topic={topic}
      onTopicChange={setTopic}
      clarification={clarification}
      onClarificationChange={setClarification}
      explanation={explanation}
      onExplanationChange={setExplanation}
      showExplanationField={isEdit || explanation.length > 0}
      language={language}
      onLanguageChange={setLanguage}
      cardCount={cardCount}
      onCardCountChange={setCardCount}
      enabledLanguages={enabledLanguages}
      grammarCases={grammarCases}
      regenerateGrammarCases={regenerateGrammarCases}
      onRegenerateGrammarCases={() => setRegenerateGrammarCases(v => !v)}
      explanationChanged={explanationChanged}
      editNodeId={editNode?.id}
    />
  );

  if (loading && isEdit) {
    return (
      <PageSheetModal
        visible={visible}
        title={title}
        cancelText={t('common.cancel')}
        onCancel={onClose}
        confirmText={confirmText}
        onConfirm={handleConfirm}
        confirmDisabled
      >
        <View className="items-center py-16">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-foreground-secondary text-base mt-4">{t('deck.loadingDeck')}</Text>
        </View>
      </PageSheetModal>
    );
  }

  return (
    <PageSheetModal
      visible={visible}
      title={title}
      cancelText={t('common.cancel')}
      onCancel={onClose}
      confirmText={confirmText}
      onConfirm={handleConfirm}
      confirmDisabled={confirmDisabled}
      confirmCloses={false}
      confirmConfirmationTitle={
        !showingJsonTab && (promptChanged || explanationChanged || regenerateGrammarCases)
          ? (promptChanged ? t('deck.regenerateTitle') : t('deck.regenerateCasesTitle'))
          : undefined
      }
      confirmConfirmationMessage={
        !showingJsonTab && (promptChanged || explanationChanged || regenerateGrammarCases)
          ? (promptChanged ? t('deck.regenerateMessage') : t('deck.regenerateCasesMessage'))
          : undefined
      }
      confirmConfirmationActionText={!showingJsonTab && (promptChanged || explanationChanged || regenerateGrammarCases) ? t('deck.confirm') : undefined}
    >
      {canUseJsonTab && (
        <AnimatedTabbed
          className="mb-6"
          variant="primary"
          tabs={[
            { value: 'create', label: t('deck.createDeck') },
            { value: 'json', label: t('deck.importJson') },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        >
          {tabContent}
        </AnimatedTabbed>
      )}

      {!canUseJsonTab && tabContent}
    </PageSheetModal>
  );
}
