import { useMemo, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/constants/theme';
import { PillDropdown } from '@/components/PillDropdown';
import { LANGUAGES, CARD_COUNTS } from '@/constants/session';
import type { Language, CardCount } from '@/constants/session';
import { useDeckTree } from '@/hooks/useDeckTree';
import { DeckTree } from '@/components/home/DeckTree';
import { DeckModal } from '@/components/home/DeckModal';
import { SettingsModal } from '@/components/home/SettingsModal';
import {
  createDeckFromPath,
  updateDeck,
  deleteNode,
  getDescendantDeckIds,
  getNodePath,
  moveNode,
} from '@/lib/api';
import type { TreeNode } from '@/lib/types';
import type { DeckFormData } from '@/components/home/DeckModal';

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { tree, loading } = useDeckTree();

  // Quick study state
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState<Language>('Japanese');
  const [cardCount, setCardCount] = useState<CardCount>(10);
  const [inputFocused, setInputFocused] = useState(false);
  const canStart = topic.trim().length > 0;

  // Deck/modal state
  const [deckModalVisible, setDeckModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [editNode, setEditNode] = useState<TreeNode | null>(null);
  const [editNodePathStr, setEditNodePathStr] = useState('');

  // ─── Handlers ───────────────────────────────────────────────────────

  function handleQuickStart() {
    const trimmed = topic.trim();
    if (!trimmed) return;
    router.push({
      pathname: '/session',
      params: { topic: trimmed, language, count: String(cardCount) },
    });
  }

  const handleStudy = useCallback(async (node: TreeNode) => {
    if (node.deck) {
      if (node.deck.explanationStatus !== 'ready') return;
      router.push({ pathname: '/session', params: { nodeId: node.id } });
    } else {
      const deckIds = await getDescendantDeckIds(node.id);
      if (deckIds.length === 0) return;
      router.push({ pathname: '/session', params: { nodeId: node.id } });
    }
  }, [router]);

  const handleEdit = useCallback(async (node: TreeNode) => {
    const path = await getNodePath(node.id);
    setEditNodePathStr(path);
    setEditNode(node);
    setDeckModalVisible(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditNode(null);
    setDeckModalVisible(true);
  }, []);

  const handleSubmit = useCallback(async (data: DeckFormData) => {
    try {
      if (editNode) {
        const pathChanged = data.path !== editNodePathStr;

        if (pathChanged) {
          await moveNode(editNode.id, data.path);
        }

        if (editNode.deck !== null) {
          const newName = data.path.split('::').pop()?.trim() ?? data.path;
          await updateDeck(editNode.id, {
            name: pathChanged ? undefined : newName,
            topic: data.topic,
            language: data.language,
            cardCount: data.cardCount,
          });
        }
      } else {
        await createDeckFromPath(data.path, data.topic, data.language, data.cardCount);
      }
      setDeckModalVisible(false);
      setEditNode(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'An error occurred.');
    }
  }, [editNode, editNodePathStr]);

  const handleDelete = useCallback(async () => {
    if (!editNode) return;
    await deleteNode(editNode.id);
    setDeckModalVisible(false);
    setEditNode(null);
  }, [editNode]);

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 80,
        }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-foreground text-xl font-bold">GrammarCrammer</Text>
          <TouchableOpacity onPress={() => setSettingsVisible(true)} className="w-10 h-10 items-center justify-center">
            <Text className="text-muted-foreground text-xl">⚙</Text>
          </TouchableOpacity>
        </View>

        {/* Deck tree */}
        <View className="w-full max-w-2xl self-center">
          {loading ? (
            <View className="items-center py-16">
              <Text className="text-muted-foreground text-base">Loading…</Text>
            </View>
          ) : (
            <DeckTree tree={tree} onStudy={handleStudy} onEdit={handleEdit} />
          )}
        </View>

        {/* Quick study */}
        <View className="w-full max-w-2xl self-center mb-6">
          <View
            className="bg-card rounded-2xl mb-3"
            style={{
              minHeight: 100,
              zIndex: 10,
              borderWidth: 1,
              borderColor: inputFocused ? colors.primary : colors.border,
              ...Platform.select({ web: inputFocused ? { boxShadow: `0 0 0 3px ${colors.primary}40` } : {} }),
            }}
          >
            <View
              className="absolute flex-row gap-2"
              style={{ top: 12, right: 12, zIndex: 20 }}
            >
              <PillDropdown value={language} options={LANGUAGES} onChange={setLanguage} />
              <PillDropdown
                value={cardCount}
                options={CARD_COUNTS}
                onChange={setCardCount}
                formatLabel={(v: number) => `${v} cards`}
              />
            </View>
            <TextInput
              className="flex-1 text-foreground text-base px-5 pb-4 focus:ring-0 focus:outline-none"
              style={{ paddingTop: 48, textAlignVertical: 'top', minHeight: 100 }}
              placeholder="Quick study — type any grammar topic"
              placeholderTextColor={colors.border}
              value={topic}
              onChangeText={setTopic}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onSubmitEditing={handleQuickStart}
              returnKeyType="go"
              blurOnSubmit
              multiline
            />
          </View>
          <TouchableOpacity
            className={`py-3 rounded-2xl items-center ${canStart ? 'bg-primary' : 'bg-input'}`}
            onPress={handleQuickStart}
            disabled={!canStart}
            activeOpacity={0.85}
          >
            <Text className={`text-base font-bold ${canStart ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
              Start Session
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        className="absolute bg-primary rounded-full items-center justify-center shadow-lg"
        style={{
          width: 56,
          height: 56,
          right: 24,
          bottom: insets.bottom + 24,
        }}
        onPress={handleCreate}
        activeOpacity={0.85}
      >
        <Text className="text-primary-foreground text-2xl font-light" style={{ marginTop: -2 }}>+</Text>
      </TouchableOpacity>

      {/* Modals */}
      <DeckModal
        visible={deckModalVisible}
        onClose={() => { setDeckModalVisible(false); setEditNode(null); }}
        onSubmit={handleSubmit}
        onDelete={editNode ? handleDelete : undefined}
        editNode={editNode}
        editNodePath={editNodePathStr}
      />
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
    </View>
  );
}
