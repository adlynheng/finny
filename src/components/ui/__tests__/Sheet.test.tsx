import { act, screen, within } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { Sheet } from '@/components/ui/Sheet';
import { classes } from '../../../../test/classes';
import { describeSheet, renderSheet } from '../../../../test/sheetCases';

// Jest resolves Sheet.tsx, the iOS implementation; Sheet.macos.test.tsx covers
// the desktop modal.

const save = { primary: { label: 'Save', onPress: jest.fn() } };

describe('Sheet on iOS: a bottom sheet', () => {
  describeSheet(Sheet);

  it('rises from the bottom over a darker scrim', async () => {
    await renderSheet(Sheet);
    expect(classes(screen.getByTestId('sheet-overlay'))).toEqual(
      expect.arrayContaining(['absolute', 'inset-0', 'justify-end']),
    );
    const scrim = screen.getByTestId('sheet-scrim');
    expect(classes(within(scrim).getByTestId('glass-fill'))).toContain(
      'bg-glass-sheet-scrim',
    );
  });

  it('sits on the bottom edge: the dragged frame fills the screen', async () => {
    await renderSheet(Sheet);
    expect(classes(screen.getByTestId('sheet-drag-frame'))).toEqual(
      expect.arrayContaining(['flex-1', 'justify-end']),
    );
  });

  it('is the solid sheet: 22 22 0 0 corners, at most 92% tall, with a grab handle', async () => {
    await renderSheet(Sheet);
    expect(classes(screen.getByTestId('sheet-surface'))).toEqual(
      expect.arrayContaining([
        'bg-glass-sheet',
        'rounded-t-sheet',
        'max-h-sheet',
      ]),
    );
    expect(classes(screen.getByTestId('sheet-handle'))).toEqual(
      expect.arrayContaining(['h-[4px]', 'w-[36px]', 'bg-sheet-handle']),
    );
    expect(classes(screen.getByTestId('sheet-surface'))).toEqual(
      expect.arrayContaining(['gap-sheet-gap', 'px-sheet-pad', 'pt-[10px]']),
    );
    expect(classes(screen.getByTestId('sheet-body'))).toContain('shrink');
  });

  it('takes a tap in the body with the keyboard up, instead of only dismissing the keyboard', async () => {
    await renderSheet(Sheet);
    expect(
      screen.getByTestId('sheet-body').props.keyboardShouldPersistTaps,
    ).toBe('handled');
  });

  const drag = (translationY: number, velocityY = 0) =>
    act(() =>
      fireGestureHandler(getByGestureTestId('sheet-drag'), [
        { state: State.BEGAN, translationY: 0 },
        { state: State.ACTIVE, translationY: translationY / 2 },
        { translationY, velocityY },
        { state: State.END, translationY, velocityY },
      ]),
    );

  it('closes when its handle is dragged down past 120pt', async () => {
    const { onClose } = await renderSheet(Sheet);
    await drag(160);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on a quick flick down, however short', async () => {
    const { onClose } = await renderSheet(Sheet);
    await drag(40, 1200);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('springs back, still open, from a short slow drag', async () => {
    const { onClose } = await renderSheet(Sheet);
    await drag(60, 100);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('drags from the handle and title, leaving the form to scroll', async () => {
    await renderSheet(Sheet);
    const zone = screen.getByTestId('sheet-drag-zone');
    expect(within(zone).getByTestId('sheet-handle')).toBeTruthy();
    expect(within(zone).getByText('New transaction')).toBeTruthy();
    expect(within(zone).queryByTestId('sheet-body')).toBeNull();
  });

  it('ignores the desktop width', async () => {
    await renderSheet(Sheet, { width: 'wide' });
    expect(
      classes(screen.getByTestId('sheet-surface')).filter(c =>
        c.startsWith('w-dialog'),
      ),
    ).toEqual([]);
  });

  it('titles it at 22px, beside a 40px soft close button', async () => {
    await renderSheet(Sheet);
    expect(classes(screen.getByText('New transaction'))).toContain(
      'ios:text-[22px]',
    );
    expect(classes(screen.getByRole('button', { name: 'Close' }))).toEqual(
      expect.arrayContaining([
        'ios:size-[40px]',
        'ios:rounded-10',
        'ios:bg-soft',
      ]),
    );
  });

  it('gives the actions 48px touch targets, the primary twice Cancel’s width', async () => {
    await renderSheet(Sheet, {
      actions: { ...save, danger: { label: 'Delete', onPress: jest.fn() } },
    });
    const button = (name: string) =>
      classes(screen.getByRole('button', { name }));
    for (const name of ['Delete', 'Cancel', 'Save']) {
      expect(button(name)).toContain('h-action');
    }
    expect(button('Cancel')).toEqual(
      expect.arrayContaining(['flex-1', 'bg-soft', 'rounded-12']),
    );
    expect(button('Save')).toEqual(
      expect.arrayContaining(['flex-2', 'bg-ink', 'rounded-12']),
    );
  });
});
