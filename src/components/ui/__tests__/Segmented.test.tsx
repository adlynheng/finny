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
