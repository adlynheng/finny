import { screen, within } from '@testing-library/react-native';
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
