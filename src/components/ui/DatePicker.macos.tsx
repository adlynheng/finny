import { Portal } from '@rn-primitives/portal';
import { useId, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Calendar } from './Calendar';
import { cx } from './cardChrome';
import {
  DateFieldButton,
  DateFieldLabel,
  type DatePickerProps,
} from './DateField';

type Frame = { x: number; y: number; width: number; height: number };

/**
 * Where the popover sits inside the full-window overlay: its bottom edge 8px
 * above the field, its right edge in line with the field's.
 */
export function popoverPlacement(
  field: Frame,
  overlay: Frame,
): { bottom: number; right: number } {
  return {
    bottom: overlay.y + overlay.height - field.y + tokens.calendar.popover.offset,
    right: overlay.x + overlay.width - (field.x + field.width),
  };
}

/**
 * Desktop: the calendar is a 300px popover opening upward from the field,
 * because the date sits low in the modal. It draws into the app's portal
 * host, above the modal and unclipped by its scrolling body, and is placed by
 * measuring the field. Choosing a day, or clicking anywhere else, closes it.
 * (DatePicker.tsx is the mobile inline calendar.)
 */
export function DatePicker({
  label = 'Date',
  value,
  onChange,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<ReturnType<
    typeof popoverPlacement
  > | null>(null);
  const field = useRef<View>(null);
  const overlay = useRef<View>(null);
  const portalName = `date-picker-${useId()}`;

  const close = () => {
    setOpen(false);
    setPlacement(null);
  };

  // Both frames in window coordinates, once the overlay has laid out.
  const place = () =>
    field.current?.measureInWindow((x, y, width, height) =>
      overlay.current?.measureInWindow((ox, oy, ow, oh) =>
        setPlacement(
          popoverPlacement(
            { x, y, width, height },
            { x: ox, y: oy, width: ow, height: oh },
          ),
        ),
      ),
    );

  return (
    <View className={cx('gap-[6px]', className)}>
      <DateFieldLabel label={label} />
      <DateFieldButton
        ref={field}
        label={label}
        value={value}
        open={open}
        onPress={() => setOpen(true)}
      />
      {open && (
        <Portal name={portalName}>
          <View
            ref={overlay}
            testID="date-popover-overlay"
            onLayout={place}
            className="absolute inset-0"
          >
            <Pressable
              testID="date-popover-dismiss"
              accessibilityRole="button"
              accessibilityLabel="Close calendar"
              onPress={close}
              className="absolute inset-0"
            />
            <View
              testID="date-popover"
              // Measured, so it cannot be a class. Hidden until placed.
              style={placement ?? undefined}
              className={cx('absolute w-popover', !placement && 'opacity-0')}
            >
              <Calendar
                raised
                selected={value}
                onSelect={date => {
                  onChange(date);
                  close();
                }}
              />
            </View>
          </View>
        </Portal>
      )}
    </View>
  );
}
