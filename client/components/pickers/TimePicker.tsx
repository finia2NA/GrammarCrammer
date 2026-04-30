import { useCallback, useEffect, useMemo, useState } from 'react';
import { normalizeTime, splitTime } from './timeUtils';
import { dismissPickerKeyboard, openAndroidTimePicker, useDateTimePickerModule } from './dateTimePickerPlatform';
import { PlatformPopover } from './PlatformPopover';
import { TimePickerContent } from './TimePickerContent';
import { TimePickerTrigger } from './TimePickerTrigger';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TimePicker({ value, onChange, disabled = false }: TimePickerProps) {
  const nativePickerModule = useDateTimePickerModule();

  const normalizedValue = useMemo(() => normalizeTime(value), [value]);
  const { hour, minute } = splitTime(normalizedValue);
  const [textValue, setTextValue] = useState(normalizedValue);
  const [draftHour, setDraftHour] = useState(hour);
  const [draftMinute, setDraftMinute] = useState(minute);

  useEffect(() => {
    setTextValue(normalizedValue);
    setDraftHour(hour);
    setDraftMinute(minute);
  }, [hour, minute, normalizedValue]);

  const pickerDate = useMemo(() => {
    const next = new Date();
    next.setHours(Number(draftHour), Number(draftMinute), 0, 0);
    return next;
  }, [draftHour, draftMinute]);

  function commitTextValue() {
    const normalized = normalizeTime(textValue);
    setTextValue(normalized);
    onChange(normalized);
  }

  const handleOpen = useCallback((openPopover: () => void) => {
    if (disabled) return;
    dismissPickerKeyboard();
    const { hour: nextHour, minute: nextMinute } = splitTime(textValue);
    const initial = new Date();
    initial.setHours(Number(nextHour), Number(nextMinute), 0, 0);

    if (openAndroidTimePicker(nativePickerModule, initial, (selected) => {
      const next = `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`;
      onChange(normalizeTime(next));
    })) {
      return;
    }

    setDraftHour(nextHour);
    setDraftMinute(nextMinute);
    openPopover();
  }, [disabled, nativePickerModule, onChange, textValue]);

  function handleDone() {
    const next = normalizeTime(`${draftHour}:${draftMinute}`);
    setTextValue(next);
    onChange(next);
  }

  function handleDraftDateChange(next: Date) {
    setDraftHour(String(next.getHours()).padStart(2, '0'));
    setDraftMinute(String(next.getMinutes()).padStart(2, '0'));
  }

  const triggerProps = {
    value,
    textValue,
    normalizedValue,
    disabled,
    onTextValueChange: setTextValue,
    onCommitTextValue: commitTextValue,
    onResetTextValue: () => setTextValue(normalizedValue),
  };

  return (
    <PlatformPopover
      title="Due Time"
      disabled={disabled}
      fallbackHeight={230}
      maxWidth={300}
      closeDelay={130}
      sheetHeight={420}
      minHeight={360}
      anchorDisplay="inline-block"
      onDone={handleDone}
      trigger={({ open, openPopover, closePopover }) => (
        <TimePickerTrigger
          {...triggerProps}
          onPress={() => {
            if (open) {
              closePopover();
              return;
            }
            handleOpen(openPopover);
          }}
        />
      )}
    >
      <TimePickerContent
        pickerDate={pickerDate}
        dateTimePickerModule={nativePickerModule}
        draftHour={draftHour}
        draftMinute={draftMinute}
        onDraftDateChange={handleDraftDateChange}
        onDraftHourChange={setDraftHour}
        onDraftMinuteChange={setDraftMinute}
      />
    </PlatformPopover>
  );
}
