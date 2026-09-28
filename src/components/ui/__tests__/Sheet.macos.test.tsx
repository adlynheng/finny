import { screen, within } from '@testing-library/react-native';
import { Sheet } from '@/components/ui/Sheet.macos';
import { classes } from '../../../../test/classes';
import {
  describeSheet,
  renderSheet,
  testIDsInOrder,
} from '../../../../test/sheetCases';

// Jest resolves './Glass' to the iOS file; Metro gives the macOS app
// Glass.macos, so the modal is tested with that. It must not load expo-blur
// (see Glass.macos.test.tsx).
jest.mock('../Glass', () => jest.requireActual('../Glass.macos'));
jest.mock('expo-blur', () => {
  throw new Error('Sheet.macos must not import expo-blur');
});

const save = { primary: { label: 'Save', onPress: jest.fn() } };

describe('Sheet on macOS: a centred modal', () => {
  describeSheet(Sheet);

  it('centres the modal over a blurred canvas scrim', async () => {
    await renderSheet(Sheet);
    expect(classes(screen.getByTestId('sheet-overlay'))).toEqual(
      expect.arrayContaining([
        'absolute',
        'inset-0',
        'items-center',
        'justify-center',
      ]),
    );
    const scrim = screen.getByTestId('sheet-scrim');
    expect(classes(within(scrim).getByTestId('glass-fill'))).toContain(
      'bg-glass-modal-scrim',
    );
    expect(within(scrim).getByTestId('glass-blur').type).toBe('FinnyBlurView');
  });

  it('is modal glass: 14px radius, 26px padding, 18px between fields', async () => {
    await renderSheet(Sheet);
    const surface = classes(screen.getByTestId('sheet-surface'));
    expect(surface).toEqual(
      expect.arrayContaining([
        'bg-glass-modal',
        'rounded-14',
        'p-dialog-pad',
        'gap-dialog-gap',
      ]),
    );
    expect(classes(screen.getByTestId('sheet-body'))).toEqual(
      expect.arrayContaining(['shrink']),
    );
  });

  it.each([
    [undefined, 'w-dialog-standard'],
    ['standard', 'w-dialog-standard'],
    ['narrow', 'w-dialog-narrow'],
    ['wide', 'w-dialog-wide'],
  ] as const)('width %s is %s', async (width, expected) => {
    await renderSheet(Sheet, { width });
    expect(classes(screen.getByTestId('sheet-surface'))).toContain(expected);
  });

  it('titles it at 24px, beside a 28px close button', async () => {
    await renderSheet(Sheet);
    expect(classes(screen.getByText('New transaction'))).toEqual(
      expect.arrayContaining(['text-[24px]', 'font-normal']),
    );
    expect(classes(screen.getByRole('button', { name: 'Close' }))).toEqual(
      expect.arrayContaining([
        'size-[28px]',
        'rounded-6',
        'hover:bg-icon-hover',
      ]),
    );
  });

  it('uses modal-sized actions: a ghost Cancel beside an ink primary', async () => {
    await renderSheet(Sheet, { actions: save });
    const cancel = classes(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancel).toEqual(
      expect.arrayContaining(['rounded-8', 'hover:bg-ghost-hover']),
    );
    expect(cancel.filter(c => c.startsWith('bg-'))).toEqual([]);
    expect(classes(screen.getByRole('button', { name: 'Save' }))).toEqual(
      expect.arrayContaining(['bg-ink', 'px-[18px]', 'py-[10px]']),
    );
  });

  it('has no grab handle', async () => {
    await renderSheet(Sheet);
    expect(screen.queryByTestId('sheet-handle')).toBeNull();
  });

  it('puts Delete on the left, then Cancel and the primary action on the right', async () => {
    await renderSheet(Sheet, {
      actions: { ...save, danger: { label: 'Delete', onPress: jest.fn() } },
    });
    const footer = screen.getByTestId('sheet-footer');
    const labels = within(footer)
      .getAllByRole('button')
      .map(b => b.props.accessibilityLabel);
    expect(labels).toEqual(['Delete', 'Cancel', 'Save']);
    expect(testIDsInOrder(footer)).toContain('sheet-footer-spacer');
    expect(
      classes(within(footer).getByRole('button', { name: 'Cancel' })),
    ).not.toContain('bg-ink');
    expect(
      classes(within(footer).getByRole('button', { name: 'Save' })),
    ).toContain('bg-ink');
  });
});
