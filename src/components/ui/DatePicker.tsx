import { useState } from 'react';
import { View } from 'react-native';
import { Calendar } from './Calendar';
import { cx } from './cardChrome';
import {
  DateFieldButton,
  DateFieldLabel,
  type DatePickerProps,
} from './DateField';

/**
 * Mobile: the calendar opens inline under the field, inside the sheet, and
 * closes when a day is chosen or the field is pressed again.
 * (DatePicker.macos.tsx is the desktop popover.)
 */
export function DatePicker({
  label = 'Date',
  value,
  onChange,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <View className={cx('gap-[6px]', className)}>
      <DateFieldLabel label={label} />
      <DateFieldButton
        label={label}
        value={value}
        open={open}
        onPress={() => setOpen(o => !o)}
      />
      {open && (
        <Calendar
          selected={value}
          onSelect={date => {
            onChange(date);
            setOpen(false);
          }}
        />
      )}
    </View>
  );
}
