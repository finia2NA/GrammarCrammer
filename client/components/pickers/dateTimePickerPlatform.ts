import { Keyboard, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

export function useDateTimePickerModule() {
  return { default: DateTimePicker, DateTimePickerAndroid };
}

export function dismissPickerKeyboard() {
  Keyboard.dismiss();
}

export function openAndroidDatePicker(
  nativePickerModule: any,
  value: Date,
  onSelected: (selected: Date) => void,
) {
  if (Platform.OS !== 'android') return false;

  nativePickerModule.DateTimePickerAndroid.open({
    value,
    mode: 'date',
    is24Hour: true,
    onChange: (_event: unknown, selected?: Date) => {
      if (!selected) return;
      onSelected(selected);
    },
  });
  return true;
}

export function openAndroidTimePicker(
  nativePickerModule: any,
  value: Date,
  onSelected: (selected: Date) => void,
) {
  if (Platform.OS !== 'android') return false;

  nativePickerModule.DateTimePickerAndroid.open({
    value,
    mode: 'time',
    is24Hour: true,
    onChange: (_event: unknown, selected?: Date) => {
      if (!selected) return;
      onSelected(selected);
    },
  });
  return true;
}
