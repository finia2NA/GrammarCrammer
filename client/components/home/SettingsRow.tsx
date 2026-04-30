import { View, Text } from 'react-native';

export function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ zIndex: 10 }} className="flex-row items-center justify-between mb-4">
      <View className="flex-1 mr-4">
        <Text className="text-foreground/80 text-sm font-medium">{label}</Text>
        {description && (
          <Text className="text-foreground-secondary text-xs mt-1">{description}</Text>
        )}
      </View>
      {children}
    </View>
  );
}
