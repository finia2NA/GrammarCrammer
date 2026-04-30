import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useColors } from '@/constants/theme';

export interface ApiKeyCardProps {
  apiKey: string;
  onApiKeyChange: (v: string) => void;
  error: string | null;
  loading: boolean;
  canSkip?: boolean;
  onSkip?: () => void;
}

export function ApiKeyCard({ apiKey, onApiKeyChange, error, loading, canSkip, onSkip }: ApiKeyCardProps) {
  const colors = useColors();
  return (
    <>
      <Text className="text-3xl font-bold text-foreground mb-2">
        Connect your Claude API key
      </Text>
      <Text className="text-foreground-secondary text-sm leading-6 mb-6">
        GrammarCrammer uses Claude to generate study content and grade your
        answers. Your key is stored securely on the server — it is only used to authenticate with Anthropic.
      </Text>
      <Text className="text-foreground/80 text-sm font-medium mb-2">
        Anthropic API Key
      </Text>
      <View className="p-1">
        <TextInput
          className="bg-background-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground-muted text-sm font-mono"
          placeholder="sk-ant-..."
          placeholderTextColor={colors.foreground_muted}
          value={apiKey}
          onChangeText={onApiKeyChange}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
      </View>
      {error && (
        <Text className="text-error text-xs mt-2">{error}</Text>
      )}
      <Text className="text-foreground-secondary/70 text-xs mt-3 leading-5">
        Get a key at console.anthropic.com. Usage costs apply based on your
        Anthropic account.
      </Text>
      {canSkip && (
        <TouchableOpacity onPress={onSkip} className="mt-4">
          <Text className="text-primary text-sm">
            Skip — use the server&apos;s key instead
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
}
