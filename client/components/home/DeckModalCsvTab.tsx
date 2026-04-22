import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { Language, CardCount } from '@/constants/session';
import { AnimatedCollapsible } from '@/components/AnimatedCollapsible';
import { SharedCreationNameField, SharedCreationOptionsSection } from './DeckModalSharedCreationFields';
import { CsvFileDropZone } from './CsvFileDropZone';

interface DeckModalCsvTabProps {
  collectionPath: string;
  onCollectionPathChange: (value: string) => void;
  language: Language;
  onLanguageChange: (value: Language) => void;
  cardCount: CardCount;
  onCardCountChange: (value: CardCount) => void;
}

export function DeckModalCsvTab({
  collectionPath,
  onCollectionPathChange,
  language,
  onLanguageChange,
  cardCount,
  onCardCountChange,
}: DeckModalCsvTabProps) {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  return (
    <View>
      <SharedCreationNameField
        label="Collection Name"
        description='Use :: to nest in collections, e.g. "Japanese::N5". Imported rows become subdecks in this collection.'
        placeholder="Japanese::N5"
        value={collectionPath}
        onChangeText={onCollectionPathChange}
      />

      <View className="mb-6 rounded-xl border border-border bg-background-muted overflow-hidden">
        <TouchableOpacity
          className="px-4 py-3 flex-row items-center justify-between"
          onPress={() => setDetailsExpanded(v => !v)}
          activeOpacity={0.85}
        >
          <Text className="text-foreground text-sm font-semibold">How this works</Text>
          <Text className="text-foreground-secondary text-sm">{detailsExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        <AnimatedCollapsible expanded={detailsExpanded} keepMounted>
          <View className="px-4 pb-4">
          <Text className="text-foreground/80 text-sm font-medium mb-2">CSV Columns</Text>
          <View className="bg-surface border border-border rounded-xl px-4 py-3 mb-3">
            <Text className="text-foreground text-sm font-mono">DeckName,Topic,Explanation</Text>
          </View>
          <Text className="text-foreground-secondary text-xs leading-5 mb-1">
            • `DeckName` and `Explanation` can be omitted.
          </Text>
          <Text className="text-foreground-secondary text-xs leading-5 mb-4">
            • If `DeckName` is blank, `Topic` is used as the deck name.
          </Text>

          <Text className="text-foreground/80 text-sm font-medium mb-2">How This Works</Text>
          <Text className="text-foreground-secondary text-xs leading-5 mb-1">
            • Each CSV row creates one subdeck inside the collection.
          </Text>
          <Text className="text-foreground-secondary text-xs leading-5 mb-1">
            • `Topic` and `Explanation` are concatenated into one prompt used for explanation and card generation.
          </Text>
          <Text className="text-foreground-secondary text-xs leading-5">
            • This tab is a placeholder for now; import execution will be added next.
          </Text>
          </View>
        </AnimatedCollapsible>
      </View>

      <Text className="text-foreground/80 text-sm font-medium mb-2">CSV File</Text>
      <Text className="text-foreground-secondary text-xs leading-5 mb-3">
        Drag and drop a `.csv` file here, or click/tap to browse.
      </Text>
      <CsvFileDropZone fileName={selectedFileName} onFileNameChange={setSelectedFileName} />

      <View className="pt-4">
        <SharedCreationOptionsSection
          language={language}
          onLanguageChange={onLanguageChange}
          cardCount={cardCount}
          onCardCountChange={onCardCountChange}
        />
      </View>
    </View>
  );
}
