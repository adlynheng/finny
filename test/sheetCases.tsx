/**
 * The behaviour both Sheet implementations share, run against each by
 * Sheet.test.tsx (the iOS bottom sheet) and Sheet.macos.test.tsx (the desktop
 * modal), in src/components/ui/__tests__.
 */

import { PortalHost } from '@rn-primitives/portal';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import type { ComponentType } from 'react';
import { Text, View } from 'react-native';
import type { SheetProps } from '@/components/ui/sheetTypes';

/**
 * One form, written once with no platform checks, which each Sheet has to
 * present as its platform's container.
 */
export function DemoForm() {
  return (
    <View>
      <Text>Amount</Text>
      <Text>Category</Text>
    </View>
  );
}

type Overrides = Partial<SheetProps>;

/** Renders a Sheet with the portal host it draws into, as the app root has. */
export async function renderSheet(
  Sheet: ComponentType<SheetProps>,
  overrides: Overrides = {},
) {
  const onClose = jest.fn();
  const props: SheetProps = {
    open: true,
    onClose,
    title: 'New transaction',
    children: <DemoForm />,
    ...overrides,
  };
  await render(
    <>
      <Sheet {...props} />
      <PortalHost />
    </>,
  );
  return { onClose: overrides.onClose ?? onClose };
}

type Host = { props: { testID?: string }; children: (Host | string)[] };

/** The host views' test IDs under `root`, in document (paint) order. */
export function testIDsInOrder(root: unknown): string[] {
  const node = root as Host;
  return [
    ...(node.props.testID ? [node.props.testID] : []),
    ...node.children.flatMap(child =>
      typeof child === 'string' ? [] : testIDsInOrder(child),
    ),
  ];
}

const actions = () => ({
  primary: { label: 'Save', onPress: jest.fn() },
  danger: { label: 'Delete', onPress: jest.fn() },
});

export function describeSheet(Sheet: ComponentType<SheetProps>) {
  it('renders nothing while closed', async () => {
    await renderSheet(Sheet, { open: false });
    expect(screen.queryByText('New transaction')).toBeNull();
    expect(screen.queryByText('Amount')).toBeNull();
  });

  it('shows its title and the form', async () => {
    await renderSheet(Sheet);
    expect(screen.getByText('New transaction')).toBeTruthy();
    expect(screen.getByText('Amount')).toBeTruthy();
    expect(screen.getByText('Category')).toBeTruthy();
  });

  it('closes on a scrim press', async () => {
    const { onClose } = await renderSheet(Sheet);
    await fireEvent.press(screen.getByTestId('sheet-scrim'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on the close button', async () => {
    const { onClose } = await renderSheet(Sheet);
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('runs the primary and danger actions', async () => {
    const a = actions();
    await renderSheet(Sheet, { actions: a });
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(a.primary.onPress).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(a.danger.onPress).toHaveBeenCalledTimes(1);
  });

  it('closes on Cancel, which it always offers beside the actions', async () => {
    const { onClose } = await renderSheet(Sheet, { actions: actions() });
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('holds a disabled primary action', async () => {
    const onPress = jest.fn();
    await renderSheet(Sheet, {
      actions: { primary: { label: 'Save', onPress, disabled: true } },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a note about the form, and none without one', async () => {
    await renderSheet(Sheet, {
      actions: actions(),
      note: '≈ S$20.00 per month',
    });
    expect(screen.getByTestId('sheet-note')).toHaveTextContent(
      '≈ S$20.00 per month',
    );
  });

  it('has no footer without actions', async () => {
    await renderSheet(Sheet);
    expect(screen.queryByTestId('sheet-footer')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  });

  it('scrolls the form alone, keeping the header and footer in place', async () => {
    await renderSheet(Sheet, { actions: actions() });
    const body = screen.getByTestId('sheet-body');
    expect(body.type).toBe('RCTScrollView');
    expect(within(body).getByText('Amount')).toBeTruthy();
    expect(within(body).queryByText('New transaction')).toBeNull();
    expect(within(body).queryByRole('button', { name: 'Close' })).toBeNull();
    expect(within(body).queryByRole('button', { name: 'Save' })).toBeNull();

    // Header, body, footer, top to bottom.
    const ids = testIDsInOrder(screen.getByTestId('sheet-surface'));
    expect(
      ids.filter(id =>
        ['sheet-header', 'sheet-body', 'sheet-footer'].includes(id),
      ),
    ).toEqual(['sheet-header', 'sheet-body', 'sheet-footer']);
  });
}
