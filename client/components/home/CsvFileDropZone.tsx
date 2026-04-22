import { TouchableOpacity, View, Text } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

interface CsvFileDropZoneProps {
  fileName: string | null;
  onFileNameChange: (name: string | null) => void;
}

export function CsvFileDropZone({ fileName, onFileNameChange }: CsvFileDropZoneProps) {
  async function handlePickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
      multiple: false,
      copyToCacheDirectory: false,
    });

    if (result.canceled || result.assets.length === 0) return;
    onFileNameChange(result.assets[0].name);
  }

  return (
    <TouchableOpacity
      className="rounded-xl items-center justify-center px-5 py-10 bg-surface border-border"
      style={{ borderWidth: 2, borderStyle: 'dashed' }}
      onPress={handlePickFile}
      activeOpacity={0.9}
    >
      <Text className="text-foreground-secondary text-sm font-semibold mb-1">Drop CSV Here</Text>
      <Text className="text-foreground-muted text-xs text-center">
        Tap to browse files. Drag and drop is supported on web.
      </Text>
      {fileName ? (
        <View className="mt-3 px-3 py-1.5 rounded-md bg-background-muted border border-border">
          <Text className="text-foreground text-xs">Selected: {fileName}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
