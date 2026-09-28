import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Button } from '@/components/ui/Button';
import { tokens } from '@/theme/tokens';
import { classes } from '../../../../test/classes';

const button = () => screen.getByRole('button', { name: 'Save' });

describe('Button', () => {
  it('primary: ink fill, white text, lime icon', async () => {
    const icon = jest.fn(() => <Text>+</Text>);
    await render(
      <Button variant="primary" label="Save" icon={icon} onPress={jest.fn()} />,
    );
    expect(classes(button())).toContain('bg-ink');
    expect(classes(screen.getByText('Save'))).toContain('text-white');
    expect(icon).toHaveBeenCalledWith(tokens.colors.lime);
  });

  it('ghost: transparent with ink text', async () => {
    const icon = jest.fn(() => <Text>+</Text>);
    await render(
      <Button variant="ghost" label="Save" icon={icon} onPress={jest.fn()} />,
    );
    expect(classes(button()).filter(c => c.startsWith('bg-'))).toEqual([]);
    expect(classes(screen.getByText('Save'))).toContain('text-ink');
    expect(icon).toHaveBeenCalledWith(tokens.colors.ink);
  });

  it('danger: danger text, no fill', async () => {
    await render(<Button variant="danger" label="Save" onPress={jest.fn()} />);
    expect(classes(button()).filter(c => c.startsWith('bg-'))).toEqual([]);
    expect(classes(screen.getByText('Save'))).toContain('text-danger');
  });

  it('fires its handler', async () => {
    const onPress = jest.fn();
    await render(<Button variant="primary" label="Save" onPress={onPress} />);
    await fireEvent.press(button());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(['primary', 'ghost', 'danger'] as const)(
    '%s: when disabled, fades and ignores presses',
    async variant => {
      const onPress = jest.fn();
      await render(
        <Button variant={variant} label="Save" onPress={onPress} disabled />,
      );
      expect(classes(button())).toContain('opacity-disabled');
      expect(button().props.accessibilityState).toMatchObject({
        disabled: true,
      });
      await fireEvent.press(button());
      expect(onPress).not.toHaveBeenCalled();
    },
  );

  it('adds the caller’s classes', async () => {
    await render(
      <Button
        variant="primary"
        label="Save"
        onPress={jest.fn()}
        className="ml-auto"
      />,
    );
    expect(classes(button())).toContain('ml-auto');
  });
});
