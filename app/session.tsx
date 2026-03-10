import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

// Placeholder — Step 3 not yet implemented
export default function Session() {
  const { topic, language, mode, count } = useLocalSearchParams<{
    topic: string;
    language: string;
    mode: string;
    count: string;
  }>();

  return (
    <View className="flex-1 items-center justify-center bg-slate-950 px-6">
      <Text className="text-white text-xl font-semibold mb-4">Session (coming soon)</Text>
      <Text className="text-slate-400 text-sm text-center">
        {mode} · {language} · {count} cards{'\n'}{topic}
      </Text>
    </View>
  );
}
