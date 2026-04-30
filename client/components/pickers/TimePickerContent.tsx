interface TimePickerContentProps {
  pickerDate: Date;
  dateTimePickerModule: any;
  draftHour?: string;
  draftMinute?: string;
  onDraftDateChange: (value: Date) => void;
  onDraftHourChange?: (value: string) => void;
  onDraftMinuteChange?: (value: string) => void;
}

export function TimePickerContent({
  pickerDate,
  dateTimePickerModule,
  onDraftDateChange,
}: TimePickerContentProps) {
  const DateTimePicker = dateTimePickerModule?.default;

  if (!DateTimePicker) return null;

  return (
    <DateTimePicker
      value={pickerDate}
      mode="time"
      display="spinner"
      is24Hour
      onChange={(_event: unknown, selected?: Date) => {
        if (!selected) return;
        onDraftDateChange(selected);
      }}
      style={{ height: 240 }}
    />
  );
}
