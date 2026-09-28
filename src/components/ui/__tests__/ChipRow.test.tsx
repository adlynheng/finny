import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ChipRow } from '@/components/ui/ChipRow';
import { tokens } from '@/theme/tokens';
import { classes } from '../../../../test/classes';

const accounts = [
  { value: 'dbs', label: 'DBS Multiplier' },
  { value: 'ocbc', label: 'OCBC 360' },
  { value: 'ibkr', label: 'IBKR' },
];

const chip = (name: string) => screen.getByRole('button', { name });

describe('ChipRow', () => {
  it('wraps its chips in a row', async () => {
    await render(
      <ChipRow
        testID="row"
        options={accounts}
        value="dbs"
        onChange={jest.fn()}
      />,
    );
    expect(classes(screen.getByTestId('row'))).toEqual(
      expect.arrayContaining(['flex-row', 'flex-wrap']),
    );
  });

  it('fills the selected chip with ink and white text', async () => {
    await render(
      <ChipRow options={accounts} value="ocbc" onChange={jest.fn()} />,
    );
    expect(classes(chip('OCBC 360'))).toContain('bg-ink');
    expect(classes(screen.getByText('OCBC 360'))).toContain('text-white');
    expect(chip('OCBC 360').props.accessibilityState).toMatchObject({
      selected: true,
    });
  });

  it('draws the others white with ink text', async () => {
    await render(
      <ChipRow options={accounts} value="ocbc" onChange={jest.fn()} />,
    );
    expect(classes(chip('IBKR'))).toContain('bg-white');
    expect(classes(chip('IBKR'))).not.toContain('bg-ink');
    expect(classes(screen.getByText('IBKR'))).toContain('text-ink');
  });

  it('selects nothing when the value matches no chip', async () => {
    await render(
      <ChipRow options={accounts} value={null} onChange={jest.fn()} />,
    );
    for (const { label } of accounts) {
      expect(classes(chip(label))).toContain('bg-white');
    }
  });

  it('reports the pressed chip', async () => {
    const onChange = jest.fn();
    await render(
      <ChipRow options={accounts} value="dbs" onChange={onChange} />,
    );
    await fireEvent.press(chip('IBKR'));
    expect(onChange).toHaveBeenCalledWith('ibkr');
  });

  it('draws a leading icon in the chip’s text colour', async () => {
    const icon = jest.fn((color: string) => (
      <Text testID={`icon-${color}`}>•</Text>
    ));
    const categories = [
      { value: 'food', label: 'Food', icon },
      { value: 'transport', label: 'Transport', icon },
    ];
    await render(
      <ChipRow options={categories} value="food" onChange={jest.fn()} />,
    );
    expect(icon).toHaveBeenCalledWith(tokens.colors.white);
    expect(icon).toHaveBeenCalledWith(tokens.colors.ink);
    // The icon comes before the label.
    const food = chip('Food') as unknown as { children: { props: any }[] };
    expect(food.children[0]?.props.testID).toBe(`icon-${tokens.colors.white}`);
  });

  it('dims a chip that cannot be chosen, and ignores its press', async () => {
    // The transfer form's destination row dims the source account.
    const onChange = jest.fn();
    await render(
      <ChipRow
        options={accounts.map(a => ({ ...a, dimmed: a.value === 'dbs' }))}
        value={null}
        onChange={onChange}
      />,
    );
    expect(classes(chip('DBS Multiplier'))).toContain('opacity-dimmed');
    expect(classes(chip('OCBC 360'))).not.toContain('opacity-dimmed');
    expect(chip('DBS Multiplier').props.accessibilityState).toMatchObject({
      disabled: true,
    });
    await fireEvent.press(chip('DBS Multiplier'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('when disabled, fades the row and ignores presses', async () => {
    const onChange = jest.fn();
    await render(
      <ChipRow
        testID="row"
        options={accounts}
        value="dbs"
        onChange={onChange}
        disabled
      />,
    );
    expect(classes(screen.getByTestId('row'))).toContain('opacity-disabled');
    await fireEvent.press(chip('IBKR'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
