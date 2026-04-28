/**
 * Web implementation of PillDropdown.
 * Uses a native <select> element styled as a pill — no custom overlay needed.
 */
import type { PillDropdownProps } from './PillDropdown';
import { useState } from 'react';

// TODO: looks bad on safari rn because it ignores the select padding, and the chrome chevron down is here a chevron updown.
export function PillDropdown<T extends string | number>({
  value, options, onChange, formatLabel,
}: PillDropdownProps<T>) {
  const [focused, setFocused] = useState(false);
  const label = (v: T) => formatLabel ? formatLabel(v) : String(v);

  return (
    <select
      value={String(value)}
      onChange={(e) => {
        const selected = options.find(o => String(o) === e.target.value);
        if (selected !== undefined) onChange(selected);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        backgroundColor: 'rgb(var(--color-background-muted))',
        color: 'rgb(var(--color-foreground))',
        border: `1px solid ${focused ? 'rgb(var(--color-primary))' : 'rgb(var(--color-border))'}`,
        borderRadius: '8px',
        padding: '6px 12px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgb(var(--color-primary) / 0.25)' : 'none',
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
      }}
    >
      {options.map((opt) => (
        <option key={String(opt)} value={String(opt)}>
          {label(opt)}
        </option>
      ))}
    </select>
  );
}
