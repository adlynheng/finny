import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Button, type ButtonVariant } from '@/components/ui/Button';
import { tokens } from '@/theme/tokens';
import { classes } from '../../../../test/classes';

const button = () => screen.getByRole('button', { name: 'Save' });
const label = () => classes(screen.getByText('Save'));

describe('Button', () => {
  it('primary: ink fill, white text, lime icon', async () => {
    const icon = jest.fn(() => <Text>+</Text>);
    await render(
      <Button variant="primary" label="Save" icon={icon} onPress={jest.fn()} />,
    );
    expect(classes(button())).toContain('bg-ink');
    expect(label()).toContain('text-white');
    expect(icon).toHaveBeenCalledWith(tokens.colors.lime);
  });

  it('ghost: no fill, ink text', async () => {
    const icon = jest.fn(() => <Text>+</Text>);
    await render(
      <Button variant="ghost" label="Save" icon={icon} onPress={jest.fn()} />,
    );
    expect(classes(button()).filter(c => c.startsWith('bg-'))).toEqual([]);
    expect(label()).toContain('text-ink');
    expect(icon).toHaveBeenCalledWith(tokens.colors.ink);
  });

  it('danger: no fill, danger text', async () => {
    await render(<Button variant="danger" label="Save" onPress={jest.fn()} />);
    expect(classes(button()).filter(c => c.startsWith('bg-'))).toEqual([]);
    expect(label()).toContain('text-danger');
  });

  it('outline: a hairline border and ink text, no fill', async () => {
    await render(<Button variant="outline" label="Save" onPress={jest.fn()} />);
    expect(classes(button())).toEqual(
      expect.arrayContaining(['border', 'border-outline-border']),
    );
    expect(classes(button()).filter(c => c.startsWith('bg-'))).toEqual([]);
    expect(label()).toContain('text-ink');
  });

  it('soft: a faint ink fill, ink text', async () => {
    await render(<Button variant="soft" label="Save" onPress={jest.fn()} />);
    expect(classes(button())).toContain('bg-soft');
    expect(label()).toContain('text-ink');
  });

  it.each([
    ['md', ['rounded-8', 'py-[10px]'], 'text-[13px]'],
    ['sm', ['rounded-6', 'py-[8px]'], 'text-[12px]'],
    ['touch', ['rounded-12', 'h-action'], 'text-[14px]'],
  ] as const)('size %s', async (size, box, text) => {
    await render(
      <Button variant="primary" size={size} label="Save" onPress={jest.fn()} />,
    );
    expect(classes(button())).toEqual(expect.arrayContaining([...box]));
    expect(label()).toContain(text);
  });

  it('is a modal action (md) by default', async () => {
    await render(<Button variant="ghost" label="Save" onPress={jest.fn()} />);
    expect(classes(button())).toEqual(
      expect.arrayContaining(['rounded-8', 'px-[16px]', 'py-[10px]']),
    );
  });

  it('outline at sm is Trading’s 28px row action', async () => {
    await render(
      <Button variant="outline" size="sm" label="Save" onPress={jest.fn()} />,
    );
    expect(classes(button())).toEqual(
      expect.arrayContaining(['h-[28px]', 'px-[14px]', 'rounded-6']),
    );
  });

  it('fires its handler', async () => {
    const onPress = jest.fn();
    await render(<Button variant="primary" label="Save" onPress={onPress} />);
    await fireEvent.press(button());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(['primary', 'ghost', 'danger', 'outline', 'soft'] as ButtonVariant[])(
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
