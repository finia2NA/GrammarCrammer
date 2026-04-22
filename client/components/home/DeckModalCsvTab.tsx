import { View, Text } from 'react-native';

export function DeckModalCsvTab() {
  return (
    <View>
      <Text className="text-foreground/80 text-sm font-medium mb-2">CSV Format</Text>
      <Text className="text-foreground-secondary text-xs leading-5 mb-3">
        This import flow is coming soon. Your CSV should include one row per card and use this header:
      </Text>
      <View className="bg-background-muted border border-border rounded-xl px-4 py-3 mb-5">
        <Text className="text-foreground text-sm font-mono">front,back,notes</Text>
      </View>

      <Text className="text-foreground/80 text-sm font-medium mb-2">Upload</Text>
      <Text className="text-foreground-secondary text-xs leading-5 mb-3">
        Drag and drop a `.csv` file into the area below, or click to browse.
      </Text>
      <View
        className="rounded-xl items-center justify-center px-5 py-10 bg-surface border-border"
        style={{ borderWidth: 2, borderStyle: 'dashed' }}
      >
        <Text className="text-foreground-secondary text-sm font-semibold mb-1">Drop CSV Here</Text>
        <Text className="text-foreground-muted text-xs text-center">
          Placeholder only for now. Import behavior will be added in the next update.
        </Text>
      </View>
    </View>
  );
}
