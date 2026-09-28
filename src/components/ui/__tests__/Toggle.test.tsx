import { fireEvent, render, screen } from '@testing-library/react-native';
import { knobLeft, Toggle } from '@/components/ui/Toggle';
import { classes } from '../../../../test/classes';

const toggle = () =>
  screen.getByRole('switch', { name: 'Count toward monthly budget' });

const renderToggle = (props: { value: boolean; disabled?: boolean }) => {
  const onChange = jest.fn();
  return render(
    <Toggle
      accessibilityLabel="Count toward monthly budget"
      onChange={onChange}
      {...props}
    />,
  ).then(() => onChange);
};

describe('Toggle', () => {
  it('is a 34×20 pill with a 16px round knob', async () => {
    await renderToggle({ value: false });
    expect(classes(toggle())).toEqual(
      expect.arrayContaining(['w-toggle-w', 'h-toggle-h', 'rounded-full']),
    );
    expect(classes(screen.getByTestId('toggle-knob'))).toEqual(
      expect.arrayContaining(['absolute', 'size-toggle-knob', 'rounded-full']),
    );
  });

  it('on: ink track, lime knob', async () => {
    await renderToggle({ value: true });
    expect(classes(toggle())).toContain('bg-ink');
    expect(classes(screen.getByTestId('toggle-knob'))).toContain('bg-lime');
    expect(toggle().props.accessibilityState).toMatchObject({ checked: true });
  });

  it('off: 14% ink track, white knob', async () => {
    await renderToggle({ value: false });
    expect(classes(toggle())).toContain('bg-toggle-off');
    expect(classes(screen.getByTestId('toggle-knob'))).toContain('bg-white');
    expect(toggle().props.accessibilityState).toMatchObject({ checked: false });
  });

  it('slides the knob from the left edge to the right, 2px in', () => {
    expect(knobLeft(false)).toBe(2);
    expect(knobLeft(true)).toBe(16);
  });

  it('rests the knob at its side', async () => {
    await renderToggle({ value: true });
    expect(screen.getByTestId('toggle-knob')).toHaveStyle({ left: 16 });
  });

  it.each([false, true])('when %s, reports the flipped value', async value => {
    const onChange = await renderToggle({ value });
    await fireEvent.press(toggle());
    expect(onChange).toHaveBeenCalledWith(!value);
  });

  it('when disabled, fades and ignores presses', async () => {
    const onChange = await renderToggle({ value: true, disabled: true });
    expect(classes(toggle())).toContain('opacity-disabled');
    expect(toggle().props.accessibilityState).toMatchObject({
      disabled: true,
    });
    await fireEvent.press(toggle());
    expect(onChange).not.toHaveBeenCalled();
  });
});
