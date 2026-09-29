import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { tokens } from '@/theme/tokens';
import { classes } from '../../../test/classes';
import { BottomBar } from '../BottomBar';

const draw = (current = 'Overview', onSelect = jest.fn(), onNew = jest.fn()) =>
  render(<BottomBar current={current} onSelect={onSelect} onNew={onNew} />);

it('floats a glass pill 12 in from the sides and 28 up from the bottom', async () => {
  await draw();
  expect(classes(screen.getByTestId('bottom-bar'))).toEqual(
    expect.arrayContaining([
      'absolute',
      'inset-x-bar-x',
      'bottom-bar-bottom',
      'rounded-bottom-pill',
      'border-glass-bottom-bar-border',
    ]),
  );
});

it('splits six tabs three and three around the new-transaction button', async () => {
  await draw();
  const ids = screen.getAllByRole('tab').map(t => t.props.testID as string);
  expect(ids).toEqual([
    'tab-Overview',
    'tab-Finance',
    'tab-Trading',
    'tab-Planner',
    'tab-AskFinny',
    'tab-Settings',
  ]);
  const row = screen.getByTestId('tab-Overview').parent!;
  expect(classes(row)).toContain('p-[5px]');
  const order = row.children
    .filter((c): c is any => typeof c !== 'string')
    .map(c => c.props.testID ?? c.children[0]?.props?.testID);
  expect(order.indexOf('new-transaction')).toBe(
    order.indexOf('tab-Trading') + 1,
  );
  for (const label of [
    'Overview',
    'Finance',
    'Trading',
    'Plan',
    'Finny',
    'Settings',
  ]) {
    expect(classes(screen.getByText(label))).toContain('text-[9.5px]');
  }
});

// Where each tab sits in the bar's row, as its onLayout would report.
const layouts: Record<string, { x: number; width: number }> = {
  Overview: { x: 5, width: 50 },
  Finance: { x: 57, width: 50 },
  Trading: { x: 109, width: 50 },
  Planner: { x: 219, width: 50 },
  AskFinny: { x: 271, width: 50 },
  Settings: { x: 323, width: 50 },
};
async function layOut() {
  for (const [name, { x, width }] of Object.entries(layouts)) {
    await fireEvent(screen.getByTestId(`tab-${name}`), 'layout', {
      nativeEvent: { layout: { x, y: 5, width, height: 54 } },
    });
  }
}
const pillAt = () =>
  getAnimatedStyle(screen.getByTestId('tab-pill') as any) as {
    left: number;
    width: number;
  };

it('puts the white, shadowed pill under the active tab, with ink text and a lit dot', async () => {
  await draw('Trading');
  await layOut();
  const pill = screen.getByTestId('tab-pill');
  expect(classes(pill)).toEqual(
    expect.arrayContaining(['absolute', 'bg-white', 'rounded-bottom-tab']),
  );
  expect(pill).toHaveStyle({ boxShadow: tokens.controls.segmented.navShadow });
  expect(pillAt()).toMatchObject({ left: 109, width: 50 });
  expect(classes(screen.getByText('Trading'))).toContain('text-ink');
  expect(classes(screen.getByTestId('tab-Trading-dot'))).toContain(
    'opacity-100',
  );
  expect(classes(screen.getByText('Overview'))).toContain('text-muted-2');
  expect(classes(screen.getByTestId('tab-Overview-dot'))).toContain(
    'opacity-0',
  );
});

it('slides the pill to a newly active tab', async () => {
  jest.useFakeTimers();
  try {
    const view = await draw('Overview');
    await layOut();
    await view.rerender(
      <BottomBar current="Settings" onSelect={jest.fn()} onNew={jest.fn()} />,
    );
    const { slideMs } = tokens.controls.segmented;
    await act(() => jest.advanceTimersByTime(slideMs / 2));
    expect(pillAt().left).toBeGreaterThan(layouts.Overview!.x);
    expect(pillAt().left).toBeLessThan(layouts.Settings!.x);
    await act(() => jest.advanceTimersByTime(slideMs));
    expect(pillAt()).toMatchObject({ left: 323, width: 50 });
  } finally {
    jest.useRealTimers();
  }
});

it('switches tabs, and shows Ask Finny disabled', async () => {
  const onSelect = jest.fn();
  await draw('Overview', onSelect);
  await fireEvent.press(screen.getByTestId('tab-Planner'));
  expect(onSelect).toHaveBeenCalledWith('Planner');
  const finny = screen.getByTestId('tab-AskFinny');
  expect(finny.props.accessibilityState.disabled).toBe(true);
  expect(classes(finny)).toContain('opacity-disabled');
  await fireEvent.press(finny);
  expect(onSelect).toHaveBeenCalledTimes(1);
});

it('opens a new transaction from the ink button', async () => {
  const onNew = jest.fn();
  await draw('Settings', jest.fn(), onNew);
  const fab = screen.getByTestId('new-transaction');
  expect(classes(fab)).toEqual(
    expect.arrayContaining(['size-fab', 'rounded-full', 'bg-ink']),
  );
  expect(fab.props.style).toEqual({
    boxShadow: tokens.frame.mobile.bottomBar.fabShadow,
  });
  await fireEvent.press(fab);
  expect(onNew).toHaveBeenCalled();
});
