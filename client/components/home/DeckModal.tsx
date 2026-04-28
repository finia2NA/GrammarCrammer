import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing, Alert, Platform } from 'react-native';
import { PageSheetModal } from '@/components/PageSheetModal';
import type { Language, CardCount } from '@/constants/session';
import { DEFAULT_LANGUAGES } from '@/constants/session';
import type { TreeNode } from '@/lib/types';
import type { CsvImportResult } from '@/lib/api';
import { exportNodeCsv, getEnabledLanguages } from '@/lib/api';
import { DeckModalCreateTab } from './DeckModalCreateTab';
import { DeckModalCsvTab } from './DeckModalCsvTab';

function triggerCsvDownload(filename: string, csv: string) {
  if (Platform.OS !== 'web') {
    Alert.alert('Export', 'CSV export is only available on web.');
    return;
  }
  const blob = new Blob([csv], { type: 'text/tab-separated-values;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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
  const [cardCount, setCardCount] = useState<CardCount>(0);
  const [enabledLanguages, setEnabledLanguages] = useState<string[]>(DEFAULT_LANGUAGES);
  const [activeTab, setActiveTab] = useState<'create' | 'csv'>('create');
  const [contentTab, setContentTab] = useState<'create' | 'csv'>('create');
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<CsvImportStatus>({ state: 'idle' });
  const [tabSwitcherWidth, setTabSwitcherWidth] = useState(0);
  const tabContentOpacity = useRef(new Animated.Value(1)).current;
  const tabContentTranslateX = useRef(new Animated.Value(0)).current;
  const tabContentHeight = useRef(new Animated.Value(0)).current;
  const tabIndicatorX = useRef(new Animated.Value(4)).current;
  const tabTransition = useRef<Animated.CompositeAnimation | null>(null);
  const tabHeightTransition = useRef<Animated.CompositeAnimation | null>(null);
  const contentHeightRef = useRef(0);
  const hasMeasuredContentRef = useRef(false);
  const pendingFadeInRef = useRef(false);
  const [hasMeasuredHeight, setHasMeasuredHeight] = useState(false);
  const [heightAnimating, setHeightAnimating] = useState(false);
  const tabWidth = tabSwitcherWidth > 0 ? (tabSwitcherWidth - 12) / 2 : 0;

  useEffect(() => {
    if (visible) {
      getEnabledLanguages(DEFAULT_LANGUAGES).then(langs => {
        setEnabledLanguages(langs);
        setLanguage((prev: string) => langs.includes(prev) ? prev : langs[0]);
      });
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setActiveTab('create');
      setContentTab('create');
      setCsvContent(null);
      setImportStatus({ state: 'idle' });
      tabTransition.current?.stop();
      tabHeightTransition.current?.stop();
      tabContentOpacity.setValue(1);
      tabContentTranslateX.setValue(0);
      tabContentHeight.setValue(0);
      hasMeasuredContentRef.current = false;
      contentHeightRef.current = 0;
      pendingFadeInRef.current = false;
      setHasMeasuredHeight(false);
      setHeightAnimating(false);
      tabIndicatorX.setValue(4);
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
        setCardCount(0);
      }
    }
  }, [visible, editNode, editNodePath, isEdit, tabContentOpacity, tabContentTranslateX, tabContentHeight, tabIndicatorX]);

  useEffect(() => {
    if (!canUseCsvTab || tabWidth <= 0) return;

    const target = activeTab === 'create' ? 4 : 8 + tabWidth;
    Animated.spring(tabIndicatorX, {
      toValue: target,
      damping: 18,
      stiffness: 240,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }, [activeTab, canUseCsvTab, tabWidth, tabIndicatorX]);

  const startFadeIn = useCallback(() => {
    tabTransition.current?.stop();
    tabTransition.current = Animated.parallel([
      Animated.timing(tabContentOpacity, {
        toValue: 1,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(tabContentTranslateX, {
        toValue: 0,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    tabTransition.current.start();
  }, [tabContentOpacity, tabContentTranslateX]);

  useEffect(() => {
    if (!visible || activeTab === contentTab) return;

    const direction = activeTab === 'csv' ? 1 : -1;
    const exitOffset = direction * -16;
    const enterOffset = direction * 16;

    tabTransition.current?.stop();
    tabTransition.current = Animated.parallel([
      Animated.timing(tabContentOpacity, {
        toValue: 0,
        duration: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(tabContentTranslateX, {
        toValue: exitOffset,
        duration: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    tabTransition.current.start(({ finished }) => {
      if (!finished) return;
      setContentTab(activeTab);
      tabContentOpacity.setValue(0);
      tabContentTranslateX.setValue(enterOffset);
      // Defer fade-in until height settles (handled in handleContentLayout).
      // Keep a fallback in case the new content's measured height matches the
      // current one within 1px and onLayout doesn't trigger an animation.
      pendingFadeInRef.current = true;
    });
  }, [activeTab, contentTab, visible, tabContentOpacity, tabContentTranslateX]);

  useEffect(() => () => {
    tabTransition.current?.stop();
    tabHeightTransition.current?.stop();
  }, []);

  const handleContentLayout = useCallback((nextHeight: number) => {
    if (nextHeight <= 0) return;
    if (!hasMeasuredContentRef.current) {
      hasMeasuredContentRef.current = true;
      contentHeightRef.current = nextHeight;
      tabContentHeight.setValue(nextHeight);
      setHasMeasuredHeight(true);
      return;
    }

    if (Math.abs(contentHeightRef.current - nextHeight) < 1) {
      if (pendingFadeInRef.current) {
        pendingFadeInRef.current = false;
        startFadeIn();
      }
      return;
    }

    contentHeightRef.current = nextHeight;
    tabHeightTransition.current?.stop();
    setHeightAnimating(true);
    tabHeightTransition.current = Animated.timing(tabContentHeight, {
      toValue: nextHeight,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    tabHeightTransition.current.start(({ finished }) => {
      setHeightAnimating(false);
      if (!finished) return;
      if (pendingFadeInRef.current) {
        pendingFadeInRef.current = false;
        startFadeIn();
      }
    });
  }, [tabContentHeight, startFadeIn]);

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
      const rawName = fileName.replace(/\.[^.]+$/, '');
      setName(rawName.replace(/__/g, '::'));
    }
  }

  const handleExport = useCallback(async () => {
    if (!editNode) return;
    try {
      const { filename, csv } = await exportNodeCsv(editNode.id);
      triggerCsvDownload(filename, csv);
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Unknown error');
    }
  }, [editNode]);

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
        <View
          className="mb-6 p-1 rounded-xl bg-background-muted border border-border flex-row gap-1 relative"
          onLayout={(event) => setTabSwitcherWidth(event.nativeEvent.layout.width)}
        >
          {tabWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              className="bg-surface rounded-lg"
              style={{
                position: 'absolute',
                top: 4,
                bottom: 4,
                left: 4,
                width: tabWidth,
                transform: [{ translateX: tabIndicatorX }],
              }}
            />
          )}
          <TouchableOpacity
            className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === 'create' ? 'bg-primary' : 'bg-background-muted'}`}
            style={{ zIndex: 1 }}
            onPress={() => setActiveTab('create')}
            activeOpacity={0.85}
          >
            <Text className={`text-sm font-semibold ${activeTab === 'create' ? 'text-primary-foreground' : 'text-primary'}`}>
              Create Deck
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === 'csv' ? 'bg-primary' : 'bg-background-muted'}`}
            style={{ zIndex: 1 }}
            onPress={() => setActiveTab('csv')}
            activeOpacity={0.85}
          >
            <Text className={`text-sm font-semibold ${activeTab === 'csv' ? 'text-primary-foreground' : 'text-primary'}`}>

              Import CSV
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Animated.View
        style={{
          opacity: tabContentOpacity,
          transform: [{ translateX: tabContentTranslateX }],
        }}
      >
        <Animated.View
          style={[
            { overflow: heightAnimating ? 'hidden' : 'visible' },
            hasMeasuredHeight ? { height: tabContentHeight } : null,
          ]}
        >
          <View onLayout={(event) => handleContentLayout(event.nativeEvent.layout.height)}>
            {contentTab === 'csv' ? (
              <DeckModalCsvTab
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
                language={language}
                onLanguageChange={setLanguage}
                cardCount={cardCount}
                onCardCountChange={setCardCount}
                enabledLanguages={enabledLanguages}
              />
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </PageSheetModal>
  );
}
