import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import { Segmented } from '@/components/ui/Segmented';
import { tokens } from '@/theme/tokens';
import { classes } from '../../../../test/classes';

const types = [
  { value: 'expense', label: 'Expense' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'transfer', label: 'Transfer' },
] as const;

const segment = (name: string) => screen.getByRole('button', { name });

const { slideMs } = tokens.controls.segmented;

// Where each segment sits in the tray, as its onLayout would report.
const layouts = {
  Expense: { x: 3, y: 3, width: 80, height: 24 },
  Deposit: { x: 83, y: 3, width: 76, height: 24 },
  Transfer: { x: 159, y: 3, width: 82, height: 24 },
};

async function layOut() {
  for (const [name, layout] of Object.entries(layouts)) {
    await fireEvent(segment(name), 'layout', { nativeEvent: { layout } });
  }
}

describe('Segmented', () => {
  it('sits its segments in a tray', async () => {
    await render(
      <Segmented
        testID="tray"
        options={types}
        value="expense"
        onChange={jest.fn()}
      />,
    );
    expect(classes(screen.getByTestId('tray'))).toEqual(
      expect.arrayContaining(['flex-row', 'bg-segment-tray']),
    );
  });

  it('field (the default): full width, even segments, 12px (13px on mobile)', async () => {
    await render(
      <Segmented
        testID="tray"
        options={types}
        value="expense"
        onChange={jest.fn()}
      />,
    );
    expect(classes(screen.getByTestId('tray'))).toEqual(
      expect.arrayContaining([
        'rounded-8',
        'ios:rounded-10',
        'bg-segment-tray',
      ]),
    );
    expect(classes(segment('Deposit'))).toEqual(
      expect.arrayContaining(['flex-1', 'rounded-6', 'ios:rounded-8']),
    );
    expect(classes(screen.getByText('Deposit'))).toEqual(
      expect.arrayContaining(['text-[12px]', 'ios:text-[13px]']),
    );
  });

  it('type: the transaction switch, a field a step larger on desktop', async () => {
    await render(
      <Segmented
        testID="tray"
        size="type"
        options={types}
        value="expense"
        onChange={jest.fn()}
      />,
    );
    expect(classes(screen.getByTestId('tray'))).toEqual(
      expect.arrayContaining(['self-stretch', 'rounded-8', 'bg-segment-tray']),
    );
    expect(classes(segment('Deposit'))).toEqual(
      expect.arrayContaining(['flex-1', 'py-[8px]', 'ios:py-[11px]']),
    );
    expect(classes(screen.getByText('Deposit'))).toContain('text-[13px]');
  });

  it('compact: the in-card switch, sized to its labels on a fainter tray', async () => {
    await render(
      <Segmented
        testID="tray"
        size="compact"
        options={types}
        value="expense"
        onChange={jest.fn()}
      />,
    );
    expect(classes(screen.getByTestId('tray'))).toEqual(
      expect.arrayContaining([
        'self-start',
        'rounded-6',
        'bg-segment-tray-soft',
      ]),
    );
    expect(classes(segment('Deposit'))).toContain('rounded-4');
    expect(classes(segment('Deposit'))).not.toContain('flex-1');
  });

  it('nav: the header’s tab pill, on a clear tray, labels darkening on hover', async () => {
    await render(
      <Segmented
        testID="tray"
        size="nav"
        options={types}
        value="expense"
        onChange={jest.fn()}
      />,
    );
    await layOut();
    expect(classes(screen.getByTestId('tray'))).toEqual(
      expect.arrayContaining(['flex-row', 'p-[4px]']),
    );
    expect(classes(screen.getByTestId('tray'))).not.toContain(
      'bg-segment-tray',
    );
    expect(classes(screen.getByTestId('tray-deposit'))).toEqual(
      expect.arrayContaining(['group', 'px-[16px]', 'py-[7px]']),
    );
    expect(classes(screen.getByText('Deposit'))).toEqual(
      expect.arrayContaining([
        'text-[13px]',
        'text-muted',
        'group-hover:text-ink',
      ]),
    );
    const pill = screen.getByTestId('segment-pill');
    expect(classes(pill)).toEqual(
      expect.arrayContaining(['top-[4px]', 'bottom-[4px]']),
    );
    expect(pill).toHaveStyle({
      boxShadow: tokens.controls.segmented.navShadow,
    });
  });

  it('onGradient: white labels on a clear tray, a white wash for the pill and no shadow', async () => {
    await render(
      <Segmented
        testID="tray"
        size="onGradient"
        options={types}
        value="expense"
        onChange={jest.fn()}
      />,
    );
    await layOut();
    expect(classes(screen.getByTestId('tray'))).toContain('p-[3px]');
    expect(classes(screen.getByTestId('tray-deposit'))).toEqual(
      expect.arrayContaining(['rounded-4', 'px-[9px]', 'py-[4px]']),
    );
    for (const label of ['Expense', 'Deposit']) {
      expect(classes(screen.getByText(label))).toEqual(
        expect.arrayContaining(['text-[11px]', 'text-white']),
      );
    }
    const pill = screen.getByTestId('segment-pill');
    expect(classes(pill)).toContain('bg-white/[.34]');
    expect(classes(pill)).not.toContain('bg-white');
    expect(pill).not.toHaveStyle({ boxShadow: expect.anything() });
  });

  it('rounds the pill like the segments', async () => {
    await render(
      <Segmented
        size="compact"
        options={types}
        value="expense"
        onChange={jest.fn()}
      />,
    );
    await layOut();
    expect(classes(screen.getByTestId('segment-pill'))).toContain('rounded-4');
  });

  it('marks the selected segment with ink text, the others muted', async () => {
    await render(
      <Segmented options={types} value="deposit" onChange={jest.fn()} />,
    );
    expect(segment('Deposit').props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(classes(screen.getByText('Deposit'))).toContain('text-ink');
    for (const name of ['Expense', 'Transfer']) {
      expect(segment(name).props.accessibilityState).toMatchObject({
        selected: false,
      });
      expect(classes(screen.getByText(name))).toContain('text-muted');
    }
  });

  it('keeps every segment transparent: one white pill slides behind them', async () => {
    await render(
      <Segmented options={types} value="deposit" onChange={jest.fn()} />,
    );
    for (const { label } of types) {
      expect(classes(segment(label)).filter(c => c.startsWith('bg-'))).toEqual(
        [],
      );
    }
  });

  it('draws no pill until the segments are measured', async () => {
    await render(
      <Segmented options={types} value="deposit" onChange={jest.fn()} />,
    );
    expect(screen.queryByTestId('segment-pill')).toBeNull();
  });

  it('places the white, shadowed pill under the selected segment', async () => {
    await render(
      <Segmented options={types} value="deposit" onChange={jest.fn()} />,
    );
    await layOut();
    const pill = screen.getByTestId('segment-pill');
    expect(classes(pill)).toEqual(
      expect.arrayContaining(['absolute', 'bg-white']),
    );
    expect(pill).toHaveStyle({
      boxShadow: tokens.controls.segmented.selectedShadow,
    });
    // Reanimated's Jest mode keeps live values off props.style.
    expect(getAnimatedStyle(pill as any)).toMatchObject({
      left: layouts.Deposit.x,
      width: layouts.Deposit.width,
    });
  });

  it('slides the pill to a newly selected segment', async () => {
    jest.useFakeTimers();
    try {
      const { rerender } = await render(
        <Segmented options={types} value="expense" onChange={jest.fn()} />,
      );
      await layOut();
      await rerender(
        <Segmented options={types} value="transfer" onChange={jest.fn()} />,
      );
      const pill = () =>
        getAnimatedStyle(screen.getByTestId('segment-pill') as any);

      // Partway there after half the slide...
      await act(() => jest.advanceTimersByTime(slideMs / 2));
      const { left } = pill() as { left: number };
      expect(left).toBeGreaterThan(layouts.Expense.x);
      expect(left).toBeLessThan(layouts.Transfer.x);

      // ...and under the new segment once it ends.
      await act(() => jest.advanceTimersByTime(slideMs));
      expect(pill()).toMatchObject({
        left: layouts.Transfer.x,
        width: layouts.Transfer.width,
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('reports the pressed segment', async () => {
    const onChange = jest.fn();
    await render(
      <Segmented options={types} value="expense" onChange={onChange} />,
    );
    await fireEvent.press(segment('Transfer'));
    expect(onChange).toHaveBeenCalledWith('transfer');
  });

  it('ignores a press on the selected segment', async () => {
    const onChange = jest.fn();
    await render(
      <Segmented options={types} value="expense" onChange={onChange} />,
    );
    await fireEvent.press(segment('Expense'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('when disabled, fades and ignores presses', async () => {
    const onChange = jest.fn();
    await render(
      <Segmented
        testID="tray"
        options={types}
        value="expense"
        onChange={onChange}
        disabled
      />,
    );
    expect(classes(screen.getByTestId('tray'))).toContain('opacity-disabled');
    await fireEvent.press(segment('Deposit'));
    expect(onChange).not.toHaveBeenCalled();
    expect(segment('Deposit').props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });
});
