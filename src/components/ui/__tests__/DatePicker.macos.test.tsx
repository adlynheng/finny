import { fireEvent, screen } from '@testing-library/react-native';
import { DatePicker, popoverPlacement } from '@/components/ui/DatePicker.macos';
import { tokens } from '@/theme/tokens';
import { classes } from '../../../../test/classes';
import {
  dateField,
  describeDatePicker,
  renderDatePicker,
} from '../../../../test/datePickerCases';

describe('DatePicker on macOS: a popover above the field', () => {
  describeDatePicker(DatePicker);

  it('opens a 300px raised popover over the whole window', async () => {
    await renderDatePicker(DatePicker);
    await fireEvent.press(dateField());
    expect(classes(screen.getByTestId('date-popover-overlay'))).toEqual(
      expect.arrayContaining(['absolute', 'inset-0']),
    );
    expect(classes(screen.getByTestId('date-popover'))).toEqual(
      expect.arrayContaining(['absolute', 'w-popover']),
    );
    expect(screen.getByTestId('calendar')).toHaveStyle({
      boxShadow: tokens.calendar.popover.shadow,
    });
  });

  it('stays hidden until it has been placed against the field', async () => {
    await renderDatePicker(DatePicker);
    await fireEvent.press(dateField());
    // The test renderer cannot measure views.
    expect(classes(screen.getByTestId('date-popover'))).toContain('opacity-0');
  });

  it('closes on a click outside it, keeping the date', async () => {
    const onChange = await renderDatePicker(DatePicker);
    await fireEvent.press(dateField());
    await fireEvent.press(screen.getByTestId('date-popover-dismiss'));
    expect(screen.queryByTestId('calendar')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('popoverPlacement', () => {
  it('sets the popover 8px above the field, right edges aligned', () => {
    const field = { x: 600, y: 520, width: 200, height: 40 };
    const overlay = { x: 0, y: 0, width: 1512, height: 982 };
    expect(popoverPlacement(field, overlay)).toEqual({
      bottom: 982 - 520 + 8,
      right: 1512 - 800,
    });
  });

  it('measures from the overlay, wherever it sits in the window', () => {
    const field = { x: 600, y: 520, width: 200, height: 40 };
    const overlay = { x: 100, y: 28, width: 1412, height: 954 };
    expect(popoverPlacement(field, overlay)).toEqual({
      bottom: 28 + 954 - 520 + 8,
      right: 100 + 1412 - 800,
    });
  });
});
