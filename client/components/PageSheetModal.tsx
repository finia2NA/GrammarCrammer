import { type ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderAction {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

interface PageSheetModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  leftAction?: HeaderAction;
  rightAction?: HeaderAction;
  children: ReactNode;
}

export function PageSheetModal({
  visible,
  onClose,
  title,
  leftAction,
  rightAction,
  children,
}: PageSheetModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-8">
            {leftAction ? (
              <TouchableOpacity onPress={leftAction.onPress} className="w-16">
                <Text className="text-primary text-base">{leftAction.label}</Text>
              </TouchableOpacity>
            ) : (
              <View className="w-16" />
            )}
            <Text className="text-foreground text-lg font-bold">{title}</Text>
            {rightAction ? (
              <TouchableOpacity
                onPress={rightAction.onPress}
                disabled={rightAction.disabled}
                className="w-16 items-end"
              >
                <Text className={`text-base font-semibold ${rightAction.disabled ? 'text-muted-foreground' : 'text-primary'}`}>
                  {rightAction.label}
                </Text>
              </TouchableOpacity>
            ) : (
              <View className="w-16" />
            )}
          </View>

          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
