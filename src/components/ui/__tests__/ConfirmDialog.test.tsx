import { PortalHost } from '@rn-primitives/portal';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { Platform } from 'react-native';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { classes } from '../../../../test/classes';

async function renderDialog(open = true, pending = false) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  await render(
    <>
      <ConfirmDialog
        open={open}
        name="Japan trip"
        detail="S$3,150 saved toward S$4,500."
        confirmLabel="Delete goal"
        onConfirm={onConfirm}
        onCancel={onCancel}
        pending={pending}
      />
      <PortalHost />
    </>,
  );
  return { onConfirm, onCancel };
}

describe.each(['macos', 'ios'] as const)('ConfirmDialog on %s', os => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', os));

  it('renders nothing while closed', async () => {
    await renderDialog(false);
    expect(screen.queryByTestId('confirm-overlay')).toBeNull();
  });

  it('names what it deletes and says it can’t be undone', async () => {
    await renderDialog();
    expect(screen.getByRole('header').props.children).toBe(
      'Delete “Japan trip”?',
    );
    expect(screen.getByTestId('confirm-detail').props.children).toBe(
      'S$3,150 saved toward S$4,500. This can’t be undone.',
    );
  });

  it('deletes on Delete; Cancel and the scrim back out', async () => {
    const { onConfirm, onCancel } = await renderDialog();
    await fireEvent.press(screen.getByLabelText('Delete goal'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByLabelText('Cancel'));
    await fireEvent.press(screen.getByTestId('sheet-scrim'));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('holds Delete while the delete is in flight', async () => {
    const { onConfirm } = await renderDialog(true, true);
    await fireEvent.press(screen.getByTestId('confirm-delete'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('fills Delete with the danger colour', async () => {
    await renderDialog();
    expect(classes(screen.getByTestId('confirm-delete'))).toEqual(
      expect.arrayContaining(['bg-danger', 'hover:bg-destructive-hover']),
    );
  });
});

describe('ConfirmDialog layout', () => {
  it('desktop: a centred 400px modal, Cancel then Delete at the right', async () => {
    jest.replaceProperty(Platform, 'OS', 'macos');
    await renderDialog();
    expect(classes(screen.getByTestId('confirm-overlay'))).toEqual(
      expect.arrayContaining(['items-center', 'justify-center']),
    );
    const surface = screen.getByTestId('confirm-surface');
    expect(classes(surface)).toEqual(
      expect.arrayContaining(['w-[400px]', 'p-[24px]', 'rounded-14']),
    );
    const labels = within(surface)
      .getAllByRole('button')
      .map(b => b.props.accessibilityLabel);
    expect(labels).toEqual(['Cancel', 'Delete goal']);
  });

  it('mobile: a white bottom sheet, Delete stacked over Cancel at 48px', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await renderDialog();
    expect(classes(screen.getByTestId('confirm-overlay'))).toContain(
      'justify-end',
    );
    const surface = screen.getByTestId('confirm-surface');
    expect(classes(surface)).toEqual(
      expect.arrayContaining(['bg-white', 'rounded-t-[20px]']),
    );
    const buttons = within(surface).getAllByRole('button');
    expect(buttons.map(b => b.props.accessibilityLabel)).toEqual([
      'Delete goal',
      'Cancel',
    ]);
    buttons.forEach(b =>
      expect(classes(b)).toEqual(
        expect.arrayContaining(['h-action', 'self-stretch']),
      ),
    );
  });
});
