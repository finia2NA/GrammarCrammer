import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '@/constants/theme';
import type { LoadPhase } from '@/lib/types';
import { GrammarMarkdown } from './GrammarMarkdown';
import { TruncationWarning } from './ExplanationPanel';

interface ExplanationOverlayProps {
  topic: string;
  explanation: string;
  wasTruncated: boolean;
  loading: boolean;
  loadPhase: LoadPhase;
  onStart: () => void;
  insets: { top: number; bottom: number };
}

export function ExplanationOverlay({
  topic, explanation, wasTruncated, loading, loadPhase, onStart, insets,
}: ExplanationOverlayProps) {
  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1 px-8"
        contentContainerStyle={{
          maxWidth: 720,
          alignSelf: 'center',
          width: '100%',
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">
          Grammar Explanation
        </Text>
        <Text className="text-white text-2xl font-bold mb-6">{topic}</Text>
        {explanation ? (
          <GrammarMarkdown>{explanation}</GrammarMarkdown>
        ) : (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        )}
        {!loading && wasTruncated && <TruncationWarning />}
        <View className="h-8" />
      </ScrollView>

      <View className="px-8 pb-10" style={{ maxWidth: 720, alignSelf: 'center', width: '100%' } as any}>
        {loading ? (
          <View className="flex-row items-center justify-center gap-3 py-4">
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text className="text-slate-500 text-sm">
              {loadPhase === 'cards' ? 'Generating flashcards…' : 'Generating explanation…'}
            </Text>
          </View>
        ) : (
          <TouchableOpacity className="bg-indigo-600 rounded-2xl py-4 items-center" onPress={onStart}>
            <Text className="text-white font-bold text-base">Start Practising →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
