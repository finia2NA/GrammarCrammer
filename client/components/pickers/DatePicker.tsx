import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { formatLocalDateToYmd, parseYmd } from './dateUtils';
import { DatePickerContent } from './DatePickerContent';
import { DatePickerTrigger } from './DatePickerTrigger';
import { dismissPickerKeyboard, openAndroidDatePicker, useDateTimePickerModule } from './dateTimePickerPlatform';
import { PlatformPopover } from './PlatformPopover';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  popoverPlacement?: 'auto' | 'above' | 'below';
  popoverTitle?: string;
  popoverFooter?: ReactNode;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick date',
  disabled = false,
  popoverPlacement = 'auto',
  popoverTitle = 'Select Date',
  popoverFooter,
}: DatePickerProps) {
  const nativePickerModule = useDateTimePickerModule();
  const selectedDate = useMemo(() => parseYmd(value), [value]);
  const [draftDate, setDraftDate] = useState<Date | null>(selectedDate);
  const [month, setMonth] = useState<Date>(selectedDate ?? new Date());

  useEffect(() => {
    if (selectedDate) setMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    setDraftDate(selectedDate);
  }, [selectedDate]);

  const handleOpen = useCallback((openPopover: () => void) => {
    if (disabled) return;
    dismissPickerKeyboard();
    const current = selectedDate ?? new Date();

    if (openAndroidDatePicker(nativePickerModule, current, (selected) => {
      onChange(formatLocalDateToYmd(selected));
    })) {
      return;
    }

    setDraftDate(selectedDate);
    setMonth(new Date(current.getFullYear(), current.getMonth(), 1));
    openPopover();
  }, [disabled, nativePickerModule, onChange, selectedDate]);

  function handleDone() {
    if (draftDate) onChange(formatLocalDateToYmd(draftDate));
  }

  return (
    <PlatformPopover
      title={popoverTitle}
      disabled={disabled}
      placement={popoverPlacement}
      fallbackHeight={430}
      maxWidth={380}
      closeDelay={140}
      sheetHeight={520}
      minHeight={500}
      footer={popoverFooter}
      onDone={handleDone}
      repositionDeps={[month]}
      trigger={({ open, openPopover, closePopover }) => (
        <DatePickerTrigger
          value={value}
          placeholder={placeholder}
          disabled={disabled}
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
      <DatePickerContent
        value={value}
        draftDate={draftDate}
        month={month}
        dateTimePickerModule={nativePickerModule}
        onDraftDateChange={setDraftDate}
        onMonthChange={setMonth}
      />
    </PlatformPopover>
  );
}
