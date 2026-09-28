import { fireEvent, render, screen } from '@testing-library/react-native';
import { Input } from '@/components/ui/Input';
import { tokens } from '@/theme/tokens';
import { classes } from '../../../../test/classes';

const field = () => screen.getByLabelText('Description');

describe('Input', () => {
  it('labels the field in small muted text above it', async () => {
    await render(
      <Input label="Description" value="" onChangeText={jest.fn()} />,
    );
    expect(classes(screen.getByText('Description'))).toEqual(
      expect.arrayContaining(['text-[12px]', 'text-muted']),
    );
    expect(field()).toBeTruthy();
  });

  it('is an outlined white box: 40px and 8px corners, 44px and 10px on mobile', async () => {
    await render(
      <Input label="Description" value="" onChangeText={jest.fn()} />,
    );
    expect(classes(screen.getByTestId('input-box'))).toEqual(
      expect.arrayContaining([
        'border',
        'border-input-border',
        'bg-white',
        'h-input',
        'ios:h-input-touch',
        'rounded-8',
        'ios:rounded-10',
        'px-[12px]',
      ]),
    );
  });

  it('writes 14px ink text, 15px on mobile, with a muted placeholder', async () => {
    await render(
      <Input
        label="Description"
        value=""
        placeholder="e.g. Kopitiam"
        onChangeText={jest.fn()}
      />,
    );
    expect(classes(field())).toEqual(
      expect.arrayContaining(['text-[14px]', 'ios:text-[15px]', 'text-ink']),
    );
    expect(field().props.placeholder).toBe('e.g. Kopitiam');
    expect(field().props.placeholderTextColor).toBe(tokens.colors.muted2);
  });

  it('reports what is typed', async () => {
    const onChangeText = jest.fn();
    await render(
      <Input label="Description" value="" onChangeText={onChangeText} />,
    );
    await fireEvent.changeText(field(), 'Toast Box');
    expect(onChangeText).toHaveBeenCalledWith('Toast Box');
  });

  it('frames the value with a muted prefix and suffix', async () => {
    await render(
      <Input
        label="Description"
        value="20"
        prefix="S$"
        suffix="%"
        onChangeText={jest.fn()}
      />,
    );
    for (const text of ['S$', '%']) {
      expect(classes(screen.getByText(text))).toEqual(
        expect.arrayContaining(['text-[13px]', 'text-muted']),
      );
    }
  });

  it('when disabled, fades and cannot be edited', async () => {
    await render(
      <Input label="Description" value="" onChangeText={jest.fn()} disabled />,
    );
    expect(classes(screen.getByTestId('input-box'))).toContain(
      'opacity-disabled',
    );
    expect(field().props.editable).toBe(false);
  });
});
