import { View, Text } from 'react-native';

export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="text-foreground/50 text-xs font-semibold uppercase tracking-widest mb-2 px-1">
        {title}
      </Text>
      <View className="h-px bg-border mb-4" />
      <View className="px-1">
        {children}
      </View>
    </View>
  );
}
