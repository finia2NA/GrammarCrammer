import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';

import { NeedsConfirmationButton } from '@/components/NeedsConfirmationButton';
import { DatePicker } from '@/components/pickers/DatePicker';
import { formatLocalDateToYmd } from '@/components/pickers/dateUtils';
import { useColors } from '@/constants/theme';
import { resetDeckToNeverStudied, setDeckDueDate } from '@/lib/api';
import type { TreeNode } from '@/lib/types';

interface ReviewScheduleSectionProps {
  node: TreeNode;
  onScheduleChanged?: () => void;
  onReviewsChanged?: () => void;
}

export function ReviewScheduleSection({
  node,
  onScheduleChanged,
  onReviewsChanged,
}: ReviewScheduleSectionProps) {
  const colors = useColors();
  const [dueDate, setDueDateState] = useState(
    node.deck?.dueAt ? formatLocalDateToYmd(new Date(node.deck.dueAt)) : ''
  );

  useEffect(() => {
    setDueDateState(node.deck?.dueAt ? formatLocalDateToYmd(new Date(node.deck.dueAt)) : '');
  }, [node]);

  async function handleDateChange(value: string) {
    setDueDateState(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    await setDeckDueDate(node.id, value);
    onScheduleChanged?.();
    onReviewsChanged?.();
  }

  async function handleReset() {
    setDueDateState('');
    await resetDeckToNeverStudied(node.id);
    onScheduleChanged?.();
    onReviewsChanged?.();
  }

  return (
    <View className="bg-surface border border-border rounded-2xl p-4 mb-4 gap-2">
      <Text className="text-foreground/80 text-sm font-medium">Review Schedule</Text>
      <DatePicker
        value={dueDate}
        onChange={handleDateChange}
        placeholder="Pick due date"
        popoverPlacement="below"
        popoverTitle="Due Date"
        popoverFooter={
          <NeedsConfirmationButton
            label="Reset to Never Studied"
            confirmLabel="Tap again to reset"
            onConfirm={handleReset}
            destructive
          />
        }
        androidNeutralButton={{
          label: 'Reset',
          textColor: colors.error,
          onPress: handleReset,
        }}
      />
    </View>
  );
}
