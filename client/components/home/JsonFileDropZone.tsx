import { TouchableOpacity, View, Text } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useI18n } from '@/lib/i18n';

interface JsonFileDropZoneProps {
  fileName: string | null;
  onFileSelected: (name: string, content: string) => void;
}

export function JsonFileDropZone({ fileName, onFileSelected }: JsonFileDropZoneProps) {
  const { t } = useI18n();
  async function handlePickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain'],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    const content = await FileSystem.readAsStringAsync(asset.uri);
    onFileSelected(asset.name, content);
  }

  return (
    <TouchableOpacity
      className="rounded-xl items-center justify-center px-5 py-10 bg-surface border-border"
      style={{ borderWidth: 2, borderStyle: 'dashed' }}
      onPress={handlePickFile}
      activeOpacity={0.9}
    >
      <Text className="text-foreground-secondary text-sm font-semibold mb-1">{t('json.dropHere')}</Text>
      <Text className="text-foreground-muted text-xs text-center">
        {t('json.browseNative')}
      </Text>
      {fileName ? (
        <View className="mt-3 px-3 py-1.5 rounded-md bg-background-muted border border-border">
          <Text className="text-foreground text-xs">{t('json.selected', { fileName })}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
