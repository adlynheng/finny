import { fireEvent, screen, within } from '@testing-library/react-native';
import { DatePicker } from '@/components/ui/DatePicker';
import { classes } from '../../../../test/classes';
import {
  dateField,
  describeDatePicker,
  renderDatePicker,
} from '../../../../test/datePickerCases';

describe('DatePicker on iOS: inline in the sheet', () => {
  describeDatePicker(DatePicker);

  it('opens the calendar in place, under the field, without a shadow', async () => {
    await renderDatePicker(DatePicker);
    await fireEvent.press(dateField());
    const calendar = screen.getByTestId('calendar');
    expect(screen.queryByTestId('date-popover')).toBeNull();
    expect(calendar.props.style).toBeUndefined();
    expect(classes(calendar)).toEqual(
      expect.arrayContaining(['rounded-12', 'border-popover-border', 'p-[14px]']),
    );
  });

  it('closes when the field is pressed again, keeping the date', async () => {
    const onChange = await renderDatePicker(DatePicker);
    await fireEvent.press(dateField());
    await fireEvent.press(dateField());
    expect(screen.queryByTestId('calendar')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses the larger mobile month buttons', async () => {
    await renderDatePicker(DatePicker);
    await fireEvent.press(dateField());
    const calendar = screen.getByTestId('calendar');
    expect(
      classes(within(calendar).getByRole('button', { name: 'Next month' })),
    ).toEqual(expect.arrayContaining(['ios:h-[32px]', 'ios:w-[36px]']));
  });
});
