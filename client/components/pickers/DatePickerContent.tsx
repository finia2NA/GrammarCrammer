import { useColors } from '@/constants/theme';
import { parseYmd } from './dateUtils';

interface DatePickerContentProps {
  value: string;
  draftDate: Date | null;
  month?: Date;
  dateTimePickerModule: any;
  themeVariant?: 'light' | 'dark';
  onDraftDateChange: (value: Date) => void;
  onMonthChange?: (value: Date) => void;
}

export function DatePickerContent({
  value,
  draftDate,
  dateTimePickerModule,
  themeVariant,
  onDraftDateChange,
}: DatePickerContentProps) {
  const colors = useColors();
  const DateTimePicker = dateTimePickerModule?.default;

  if (!DateTimePicker) return null;

  return (
    <DateTimePicker
      value={draftDate ?? (parseYmd(value) ?? new Date())}
      mode="date"
      display="inline"
      accentColor={colors.primary}
      textColor={colors.foreground}
      themeVariant={themeVariant}
      onChange={(_event: unknown, selected?: Date) => {
        if (!selected) return;
        onDraftDateChange(selected);
      }}
    />
  );
}
