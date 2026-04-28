import { View, Text, TouchableOpacity } from 'react-native';
import { ALL_LANGUAGES_BY_REGION } from '@/constants/session';
import { useColors } from '@/constants/theme';

interface LanguagePickerProps {
  enabled: string[];
  onChange: (langs: string[]) => void;
}

export function LanguagePicker({ enabled, onChange }: LanguagePickerProps) {
  const colors = useColors();

  function toggle(lang: string) {
    if (enabled.includes(lang)) {
      if (enabled.length === 1) return;
      onChange(enabled.filter(l => l !== lang));
    } else {
      onChange([...enabled, lang]);
    }
  }

  return (
    <View className="gap-4">
      {ALL_LANGUAGES_BY_REGION.map(({ region, languages }: { region: string; languages: string[] }) => (
        <View key={region}>
          <Text className="text-foreground/50 text-xs font-semibold uppercase tracking-widest mb-2">
            {region}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {languages.map((lang: string) => {
              const selected = enabled.includes(lang);
              return (
                <TouchableOpacity
                  key={`${region}-${lang}`}
                  onPress={() => toggle(lang)}
                  activeOpacity={0.75}
                  className="flex-row items-center rounded-full border px-3 py-1.5"
                  style={{
                    backgroundColor: selected ? colors.foreground : 'transparent',
                    borderColor: selected ? colors.foreground : colors.border,
                  }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{ color: selected ? colors.background : colors.foreground_secondary }}
                  >
                    {selected ? '✓  ' : ''}{lang}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
