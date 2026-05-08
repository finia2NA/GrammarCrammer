import { useColors } from '@/constants/theme';

interface TimePickerContentProps {
  pickerDate: Date;
  dateTimePickerModule: any;
  themeVariant?: 'light' | 'dark';
  draftHour?: string;
  draftMinute?: string;
  onDraftDateChange: (value: Date) => void;
  onDraftHourChange?: (value: string) => void;
  onDraftMinuteChange?: (value: string) => void;
}

export function TimePickerContent({
  pickerDate,
  dateTimePickerModule,
  themeVariant,
  onDraftDateChange,
}: TimePickerContentProps) {
  const colors = useColors();
  const DateTimePicker = dateTimePickerModule?.default;

  if (!DateTimePicker) return null;

  return (
    <DateTimePicker
      value={pickerDate}
      mode="time"
      display="spinner"
      is24Hour
      accentColor={colors.primary}
      textColor={colors.foreground}
      themeVariant={themeVariant}
      onChange={(_event: unknown, selected?: Date) => {
        if (!selected) return;
        onDraftDateChange(selected);
      }}
      style={{ height: 240 }}
    />
  );
}
