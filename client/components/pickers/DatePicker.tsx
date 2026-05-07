import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { formatLocalDateToYmd, parseYmd } from './dateUtils';
import { DatePickerContent } from './DatePickerContent';
import { DatePickerTrigger } from './DatePickerTrigger';
import { dismissPickerKeyboard, openAndroidDatePicker, openIosDatePicker, useDateTimePickerModule } from './dateTimePickerPlatform';
import { PlatformPopover } from './PlatformPopover';
import { useColors } from '@/constants/theme';
import { useI18n } from '@/lib/i18n';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  popoverPlacement?: 'auto' | 'above' | 'below';
  popoverTitle?: string;
  popoverFooter?: ReactNode;
  androidNeutralButton?: {
    label: string;
    textColor?: string;
    onPress: () => void;
  };
  iosResetButtonProps?: {
    label: string;
    armedLabel?: string;
    textColor?: string;
    onPress: () => void;
  };
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled = false,
  popoverPlacement = 'auto',
  popoverTitle,
  popoverFooter,
  androidNeutralButton,
  iosResetButtonProps,
}: DatePickerProps) {
  const colors = useColors();
  const { t } = useI18n();
  const nativePickerModule = useDateTimePickerModule();
  const displayPlaceholder = placeholder ?? t('picker.pickDate');
  const displayTitle = popoverTitle ?? t('picker.selectDate');
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
    const androidOptions = androidNeutralButton ? {
      neutralButton: {
        label: androidNeutralButton.label,
        textColor: androidNeutralButton.textColor,
      },
      onNeutralButtonPress: androidNeutralButton.onPress,
    } : undefined;

    if (openAndroidDatePicker(nativePickerModule, current, (selected) => {
      onChange(formatLocalDateToYmd(selected));
    }, androidOptions)) {
      return;
    }

    if (openIosDatePicker(current, (selected) => {
      onChange(formatLocalDateToYmd(selected));
    }, {
      title: displayTitle,
      cancelText: t('common.cancel'),
      confirmText: t('common.done'),
      accentColor: colors.primary,
      sheetBackgroundColor: colors.background,
      panelBackgroundColor: colors.surface,
      resetButton: iosResetButtonProps ? {
        label: iosResetButtonProps.label,
        armedLabel: iosResetButtonProps.armedLabel,
        textColor: iosResetButtonProps.textColor,
        onPress: iosResetButtonProps.onPress,
      } : undefined,
    })) {
      return;
    }

    setDraftDate(selectedDate);
    setMonth(new Date(current.getFullYear(), current.getMonth(), 1));
    openPopover();
  }, [androidNeutralButton, colors.background, colors.primary, colors.surface, disabled, displayTitle, iosResetButtonProps, nativePickerModule, onChange, selectedDate, t]);

  function handleDone() {
    if (draftDate) onChange(formatLocalDateToYmd(draftDate));
  }

  return (
    <PlatformPopover
      title={displayTitle}
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
          placeholder={displayPlaceholder}
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
