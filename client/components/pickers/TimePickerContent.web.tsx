import { type CSSProperties } from 'react';
import { useColors } from '@/constants/theme';

interface TimePickerContentProps {
  pickerDate?: Date;
  dateTimePickerModule?: any;
  draftHour: string;
  draftMinute: string;
  onDraftDateChange?: (value: Date) => void;
  onDraftHourChange: (value: string) => void;
  onDraftMinuteChange: (value: string) => void;
}

export function TimePickerContent({
  draftHour,
  draftMinute,
  onDraftHourChange,
  onDraftMinuteChange,
}: TimePickerContentProps) {
  const colors = useColors();
  const selectStyle: CSSProperties = {
    height: 42,
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: colors.background_muted,
    color: colors.foreground,
    padding: '0 10px',
    fontSize: 17,
    fontWeight: 650,
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <select value={draftHour} onChange={(e) => onDraftHourChange(e.target.value)} style={selectStyle}>
        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((hour) => (
          <option key={hour} value={hour}>{hour}</option>
        ))}
      </select>
      <select value={draftMinute} onChange={(e) => onDraftMinuteChange(e.target.value)} style={selectStyle}>
        {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((minute) => (
          <option key={minute} value={minute}>{minute}</option>
        ))}
      </select>
    </div>
  );
}
