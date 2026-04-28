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
          <Text className="text-foreground/50 text-sm font-semibold uppercase tracking-widest mb-2">
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
                  className="flex-row items-center rounded-full border px-4 py-2 gap-2"
                  style={{ borderColor: selected ? colors.foreground : colors.border }}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: selected ? colors.success : colors.foreground_subtle }}
                  >
                    ✓
                  </Text>
                  <Text
                    className="text-sm font-medium"
                    style={{ color: selected ? colors.foreground : colors.foreground_secondary }}
                  >
                    {lang}
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
