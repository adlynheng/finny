import { Platform } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';

import { MonthStepper } from '@/components/ui/MonthStepper';
import { classes } from '../../../../test/classes';

afterEach(() => jest.restoreAllMocks());

const draw = (month: string, onChange = jest.fn(), tone?: 'onGradient') =>
  render(
    <MonthStepper
      month={month}
      min="2026-07"
      max="2026-09"
      onChange={onChange}
      tone={tone}
    />,
  );

it('shows the month between its arrows', async () => {
  await draw('2026-08');
  expect(screen.getByTestId('month-stepper-label')).toHaveTextContent(
    'Aug 2026',
  );
});

it('steps a month either way', async () => {
  const onChange = jest.fn();
  await draw('2026-08', onChange);
  await fireEvent.press(screen.getByLabelText('Previous month'));
  await fireEvent.press(screen.getByLabelText('Next month'));
  expect(onChange.mock.calls).toEqual([['2026-07'], ['2026-09']]);
});

it('fades and stops its arrows at the bounds', async () => {
  const onChange = jest.fn();
  await draw('2026-09', onChange);
  const next = screen.getByLabelText('Next month');
  expect(next.props.accessibilityState.disabled).toBe(true);
  expect(classes(next)).toContain('opacity-dimmed');
  await fireEvent.press(next);
  expect(onChange).not.toHaveBeenCalled();

  await draw('2026-07', onChange);
  expect(
    screen.getAllByLabelText('Previous month').at(-1)!.props.accessibilityState
      .disabled,
  ).toBe(true);
});

it('sits in glass on a gradient, with white arrows and label', async () => {
  await draw('2026-08', jest.fn(), 'onGradient');
  expect(
    within(screen.getByTestId('month-stepper')).getByTestId('glass-fill'),
  ).toBeTruthy();
  expect(classes(screen.getByTestId('month-stepper-label'))).toContain(
    'text-white',
  );
});

it('gives mobile 34 × 32 arrows that reach a 44-point target', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  await draw('2026-08');
  const prev = screen.getByLabelText('Previous month');
  expect(classes(prev)).toEqual(
    expect.arrayContaining(['ios:h-[32px]', 'ios:w-[34px]']),
  );
  expect(prev.props.hitSlop).toBe(6);
});
