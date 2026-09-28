/**
 * The behaviour both DatePicker implementations share, run against each by
 * DatePicker.test.tsx (inline on iOS) and DatePicker.macos.test.tsx (the
 * desktop popover), in src/components/ui/__tests__.
 */

import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentType } from 'react';
import type { DatePickerProps } from '@/components/ui/DateField';
import { freezeToday, resetToday } from '@/lib/today';
import { classes } from './classes';

/** Renders a DatePicker with the portal host the popover draws into. */
export async function renderDatePicker(
  DatePicker: ComponentType<DatePickerProps>,
  value: string | null = '2026-09-10',
) {
  const onChange = jest.fn();
  await render(
    <>
      <DatePicker value={value} onChange={onChange} />
      <PortalHost />
    </>,
  );
  return onChange;
}

export const dateField = () => screen.getByRole('button', { name: 'Date' });

export function describeDatePicker(DatePicker: ComponentType<DatePickerProps>) {
  beforeEach(() => freezeToday('2026-09-24'));
  afterEach(resetToday);

  it('labels the field and shows the date in full', async () => {
    await renderDatePicker(DatePicker);
    expect(classes(screen.getByText('Date'))).toEqual(
      expect.arrayContaining(['text-[12px]', 'text-muted']),
    );
    expect(screen.getByText('Thu, 10 Sep 2026')).toBeTruthy();
    expect(dateField().props.accessibilityValue).toEqual({
      text: 'Thu, 10 Sep 2026',
    });
  });

  it('asks for a date when there is none', async () => {
    await renderDatePicker(DatePicker, null);
    expect(screen.getByText('Pick a date')).toBeTruthy();
  });

  it('is an outlined field like a text input: 40px, 44px on mobile', async () => {
    await renderDatePicker(DatePicker);
    expect(classes(dateField())).toEqual(
      expect.arrayContaining([
        'h-input',
        'ios:h-input-touch',
        'rounded-8',
        'ios:rounded-10',
        'border',
        'border-input-border',
        'bg-white',
        'justify-between',
      ]),
    );
  });

  it('keeps the calendar closed until the field is pressed', async () => {
    await renderDatePicker(DatePicker);
    expect(screen.queryByTestId('calendar')).toBeNull();
    await fireEvent.press(dateField());
    expect(screen.getByTestId('calendar')).toBeTruthy();
    expect(screen.getByText('September')).toBeTruthy();
    expect(dateField().props.accessibilityState).toMatchObject({
      expanded: true,
    });
  });

  it('darkens the field border while the calendar is open', async () => {
    await renderDatePicker(DatePicker);
    await fireEvent.press(dateField());
    expect(classes(dateField())).toContain('border-input-open-border');
    expect(classes(dateField())).not.toContain('border-input-border');
  });

  it('opens on the current month when there is no date', async () => {
    await renderDatePicker(DatePicker, null);
    await fireEvent.press(dateField());
    expect(screen.getByText('September')).toBeTruthy();
  });

  it('pages months without changing the date', async () => {
    const onChange = await renderDatePicker(DatePicker);
    await fireEvent.press(dateField());
    await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('October')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Thu, 10 Sep 2026')).toBeTruthy();
  });

  it('choosing a day reports it and closes the calendar', async () => {
    const onChange = await renderDatePicker(DatePicker);
    await fireEvent.press(dateField());
    await fireEvent.press(
      screen.getByRole('button', { name: 'Tue, 15 Sep 2026' }),
    );
    expect(onChange).toHaveBeenCalledWith('2026-09-15');
    expect(screen.queryByTestId('calendar')).toBeNull();
    expect(classes(dateField())).toContain('border-input-border');
  });

  it('reopens on the chosen month after paging away', async () => {
    await renderDatePicker(DatePicker);
    await fireEvent.press(dateField());
    await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Mon, 5 Oct 2026' }),
    );
    // The parent kept 10 Sep, so the calendar opens on September again.
    await fireEvent.press(dateField());
    expect(screen.getByText('September')).toBeTruthy();
  });
}
