import { useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Icon } from '@/components/Icon';
import { TouchTarget } from '@/components/TouchTarget';
import type { SemanticIcon } from '@/components/Icon.types';
import { useColors } from '@/constants/theme';

export type PlatformButtonVariant =
  | 'plain'
  | 'filled'
  | 'gray'
  | 'tinted'
  | 'glass'
  | 'prominentGlass'
  | 'clearGlass'
  | 'prominentClearGlass';
export type PlatformButtonFontWeight = 'regular' | 'medium' | 'semibold' | 'bold';

interface SharedPlatformButtonProps {
  onPress: () => void;
  disabled?: boolean;
  variant?: PlatformButtonVariant;
  color?: string;
  backgroundColor?: string;
  disabledColor?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fontSize?: number;
  fontWeight?: PlatformButtonFontWeight;
  iconSize?: number;
  horizontalPadding?: number;
  verticalPadding?: number;
  cornerRadius?: number;
  contentAlignment?: 'left' | 'center' | 'right';
  accessibilityLabel?: string;
  confirmationTitle?: string;
  confirmationMessage?: string;
  confirmationActionText?: string;
  confirmationDestructive?: boolean;
}

type TextPlatformButtonProps = SharedPlatformButtonProps & {
  text: string;
  icon?: never;
};

type IconPlatformButtonProps = SharedPlatformButtonProps & {
  icon: SemanticIcon;
  text?: never;
};

export type PlatformButtonProps = TextPlatformButtonProps | IconPlatformButtonProps;

export function PlatformButton({
  text,
  icon,
  onPress,
  disabled = false,
  color,
  backgroundColor,
  disabledColor,
  style,
  textStyle,
  iconSize = 18,
  horizontalPadding,
  verticalPadding,
  cornerRadius,
  contentAlignment,
  accessibilityLabel,
  confirmationTitle,
  confirmationMessage,
  confirmationActionText,
  confirmationDestructive,
}: PlatformButtonProps) {
  const colors = useColors();
  const anchorRef = useRef<View>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const resolvedColor = disabled ? disabledColor : color;
  const shouldConfirm = !!confirmationActionText && (!!confirmationTitle || !!confirmationMessage);

  function handlePress() {
    if (!shouldConfirm) {
      onPress();
      return;
    }

    if (Platform.OS === 'android') {
      Alert.alert(
        confirmationTitle ?? '',
        confirmationMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: confirmationActionText,
            style: confirmationDestructive ? 'destructive' : 'default',
            onPress,
          },
        ],
      );
      return;
    }

    if (Platform.OS === 'web') {
      anchorRef.current?.measureInWindow((x, y, width, height) => {
        setAnchorRect({ x, y, width, height });
        setConfirmationOpen(true);
      });
      return;
    }

    onPress();
  }

  const popoverWidth = Math.min(300, Math.max(220, windowWidth - 24));
  const popoverLeft = Math.min(
    Math.max(12, anchorRect.x + anchorRect.width - popoverWidth),
    Math.max(12, windowWidth - popoverWidth - 12),
  );
  const popoverTop = Math.min(
    Math.max(12, anchorRect.y + anchorRect.height + 8),
    Math.max(12, windowHeight - 220),
  );

  function confirmFromPopover() {
    setConfirmationOpen(false);
    onPress();
  }

  return (
    <View ref={anchorRef} collapsable={false}>
      <TouchTarget
        onPress={handlePress}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel ?? text}
        style={[
          backgroundColor ? { backgroundColor } : undefined,
          horizontalPadding !== undefined ? { paddingHorizontal: horizontalPadding } : undefined,
          verticalPadding !== undefined ? { paddingVertical: verticalPadding } : undefined,
          cornerRadius !== undefined ? { borderRadius: cornerRadius } : undefined,
          contentAlignment ? { alignItems: contentAlignment === 'left' ? 'flex-start' : contentAlignment === 'right' ? 'flex-end' : 'center' } : undefined,
          style,
        ]}
      >
        {icon ? (
          <Icon name={icon} size={iconSize} color={resolvedColor} />
        ) : (
          <Text style={[textStyle, resolvedColor ? { color: resolvedColor } : undefined]}>
            {text}
          </Text>
        )}
      </TouchTarget>

      {Platform.OS === 'web' && shouldConfirm ? (
        <Modal
          transparent
          visible={confirmationOpen}
          animationType="fade"
          onRequestClose={() => setConfirmationOpen(false)}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setConfirmationOpen(false)}>
            <Pressable
              onPress={(event) => event.stopPropagation()}
              style={[
                styles.webPopover,
                {
                  width: popoverWidth,
                  top: popoverTop,
                  left: popoverLeft,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            >
              {confirmationTitle ? (
                <Text style={[styles.webTitle, { color: colors.foreground }]}>
                  {confirmationTitle}
                </Text>
              ) : null}
              {confirmationMessage ? (
                <Text style={[styles.webMessage, { color: colors.foreground_secondary }]}>
                  {confirmationMessage}
                </Text>
              ) : null}
              <View style={styles.webActions}>
                <Pressable
                  onPress={() => setConfirmationOpen(false)}
                  style={[styles.webSecondaryButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                  <Text style={[styles.webSecondaryText, { color: colors.foreground }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={confirmFromPopover}
                  style={[styles.webPrimaryButton, { backgroundColor: confirmationDestructive ? colors.error : colors.primary }]}
                >
                  <Text style={styles.webPrimaryText}>{confirmationActionText}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  webPopover: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  webTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  webMessage: {
    fontSize: 13,
    lineHeight: 19,
  },
  webActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  webSecondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  webPrimaryButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  webSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  webPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
