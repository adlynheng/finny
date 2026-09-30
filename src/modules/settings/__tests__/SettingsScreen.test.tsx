import { Platform } from 'react-native';
import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { getAnimatedStyle } from 'react-native-reanimated';

import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { initialUiState, useUiStore } from '@/stores/uiStore';
import { SettingsScreen } from '../SettingsScreen';
import { classes } from '../../../../test/classes';
import { TODAY } from '../../../../test/financeFixtures';
import { accounts } from '../../../../test/overviewFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import {
  cards,
  respondSettings,
  settingsRow,
  themedCards,
} from '../../../../test/settingsFixtures';
import { testIDsInOrder } from '../../../../test/sheetCases';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => {
  stub.reset();
  jest.useFakeTimers();
  freezeToday(TODAY);
  useUiStore.setState(initialUiState());
  respondSettings(stub);
});
afterEach(() => {
  resetToday();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const draw = async () => {
  await renderWithClient(
    <>
      <SettingsScreen />
      <PortalHost />
    </>,
  );
  await screen.findByTestId('fan-card-1');
};
const card = (id: number) => screen.getByTestId(`fan-card-${id}`);
const place = (id: number) => {
  const { left, top, transform } = getAnimatedStyle(card(id) as any);
  const zIndex = [card(id).props.style].flat(3).find(s => s?.zIndex)?.zIndex;
  return { left, top, zIndex, transform };
};
const settle = () => jest.advanceTimersByTime(1000);
const texts = (testID: string) =>
  within(screen.getByTestId(testID))
    .queryAllByText(/.*/)
    .map(t => t.props.children);

describe.each(['macos', 'ios'] as const)('the card fan on %s', os => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', os));

  it('draws every card face with its bank, number, holder and kind', async () => {
    await draw();
    const face = within(card(3));
    expect(face.getByText('DBS Multiplier')).toBeTruthy();
    expect(face.getByText('Visa Debit')).toBeTruthy();
    expect(face.getByText('•••• 0157')).toBeTruthy();
    expect(face.getByText('Wei Ling Tan')).toBeTruthy();
    expect(face.getByText('Debit')).toBeTruthy();
    expect(face.getByTestId('card-chip')).toBeTruthy();
  });

  it('pressing a card brings it to the front and eases the rest back', async () => {
    await draw();
    expect(place(1).zIndex).toBe(50);
    await fireEvent.press(screen.getByLabelText('UOB One Credit •••• 7390'));
    expect(place(2).zIndex).toBe(50);
    expect(place(1).zIndex).toBe(2);
    settle();
    expect(place(2)).toMatchObject({
      top: 0,
      transform: [{ rotate: '0deg' }, { scale: 1 }],
    });
    expect(place(1)).toMatchObject({
      top: 26,
      transform: [{ rotate: '-6deg' }, { scale: 0.92 }],
    });
  });
});

it('desktop: the fan spreads 320px cards over the 680px hero column', async () => {
  jest.replaceProperty(Platform, 'OS', 'macos');
  await draw();
  expect(classes(screen.getByTestId('settings-hero'))).toContain('h-[330px]');
  expect(classes(screen.getByTestId('card-fan').parent!)).toContain(
    'w-[680px]',
  );
  expect(classes(card(1))).toEqual(
    expect.arrayContaining(['w-[320px]', 'aspect-[1.586]']),
  );
  expect([1, 2, 3].map(id => place(id).left)).toEqual([180, 0, 360]);
});

it('desktop: nav, panel and share of assets sit under the hero at 230px, 1fr and 360px', async () => {
  jest.replaceProperty(Platform, 'OS', 'macos');
  await draw();
  expect(classes(screen.getByTestId('settings-nav-cell'))).toContain(
    'w-[230px]',
  );
  expect(classes(screen.getByTestId('settings-panel-cell'))).toContain(
    'flex-1',
  );
  expect(classes(screen.getByTestId('settings-share-cell'))).toContain(
    'w-[360px]',
  );
});

it('light themes take dark ink, dark ones white', async () => {
  jest.replaceProperty(Platform, 'OS', 'macos');
  respondSettings(stub, { cards: themedCards });
  await draw();
  const ink = (id: number) =>
    classes(within(card(id)).getByText(`•••• ${4820 + id}`));
  expect([1, 2, 3].map(ink)).toEqual(
    Array(3).fill(expect.arrayContaining(['text-white'])),
  );
  expect([4, 5, 6].map(ink)).toEqual(
    Array(3).fill(expect.arrayContaining(['text-ink'])),
  );
});

describe('the hero’s columns', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'macos'));

  it('left: initials, name and email, and the meta chips', async () => {
    await draw();
    expect(screen.getByTestId('avatar-initials').props.children).toBe('WL');
    expect(screen.getByTestId('settings-name')).toHaveTextContent(
      'Wei Ling Tan',
    );
    expect(screen.getByText('weiling.tan@gmail.com')).toBeTruthy();
    expect(screen.queryByText('Sign out')).toBeNull();
    const profile = within(screen.getByTestId('settings-profile'));
    expect(profile.getByText('3 cards')).toBeTruthy();
    expect(profile.getByText('5 accounts')).toBeTruthy();
    expect(profile.getByText('Singapore · SGD')).toBeTruthy();
  });

  it('edits the name in place, saving it on return', async () => {
    await draw();
    await fireEvent.press(screen.getByTestId('settings-name'));
    const input = screen.getByTestId('settings-name-input');
    expect(input.props.value).toBe('Wei Ling Tan');
    const renamed = { ...settingsRow, name: 'Wei Ling' };
    stub.respond('settings', { data: renamed, error: null });
    await fireEvent.changeText(input, '  Wei Ling ');
    await fireEvent(input, 'submitEditing');
    expect(stub.chainsFor('settings').at(-2)?.[0]).toEqual([
      'update',
      { name: 'Wei Ling' },
    ]);
    expect(await screen.findByTestId('settings-name')).toHaveTextContent(
      /^Wei Ling$/,
    );
    expect(screen.getByTestId('avatar-initials').props.children).toBe('WL');
  });

  it('keeps the old name when the new one is blank', async () => {
    await draw();
    await fireEvent.press(screen.getByTestId('settings-name'));
    const input = screen.getByTestId('settings-name-input');
    await fireEvent.changeText(input, '   ');
    await fireEvent(input, 'blur');
    expect(screen.getByTestId('settings-name')).toHaveTextContent(
      'Wei Ling Tan',
    );
    expect(
      stub.chainsFor('settings').some(chain => chain[0]?.[0] === 'update'),
    ).toBe(false);
  });

  it('right, a credit card: rewards, earned, limit and statement date', async () => {
    await draw();
    const detail = within(screen.getByTestId('card-detail'));
    expect(detail.getByText('DBS Altitude •••• 4821')).toBeTruthy();
    expect(detail.getByText('Credit · VISA')).toBeTruthy();
    expect(detail.getByText('1.3 mpd local · 2.2 mpd overseas')).toBeTruthy();
    expect(texts('card-stats')).toEqual([
      'Earned this cycle',
      '2,570 mi',
      'Credit limit',
      'S$12,000',
      'Statement',
      '18 Oct',
    ]);
  });

  it('right, a debit card: earned, this month’s spend from its account, and linked as', async () => {
    await draw();
    await fireEvent.press(
      screen.getByLabelText('DBS Multiplier Debit •••• 0157'),
    );
    // DBS Multiplier paid the S$1,140 home loan in September; its transfer out is not spend.
    expect(texts('card-stats')).toEqual([
      'Earned this cycle',
      'S$72.60',
      'Spent this month',
      'S$1,140',
      'Linked as',
      'Salary account',
    ]);
  });

  it('the budget switch writes the card’s include_in_budget', async () => {
    await draw();
    const toggle = screen.getByTestId('card-in-budget');
    expect(toggle.props.accessibilityState.checked).toBe(true);
    await fireEvent.press(toggle);
    expect(stub.chainsFor('card').at(-2)).toEqual([
      ['update', { include_in_budget: false }],
      ['eq', 'id', 1],
    ]);
  });
});

describe('Add card', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'macos'));

  const open = async () => {
    await draw();
    await fireEvent.press(screen.getByTestId('add-card'));
  };
  const addButton = () => screen.getByLabelText('Add');

  it('needs a name and exactly four digits', async () => {
    await open();
    expect(addButton().props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByLabelText('Card name'), 'Citi');
    await fireEvent.changeText(screen.getByLabelText('Last 4 digits'), '12a3');
    expect(screen.getByLabelText('Last 4 digits').props.value).toBe('123');
    expect(addButton().props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByLabelText('Last 4 digits'), '1234');
    expect(addButton().props.accessibilityState.disabled).toBe(false);
  });

  it('a credit card’s billing cycle: both days or neither, each 1–31', async () => {
    await open();
    await fireEvent.changeText(screen.getByLabelText('Card name'), 'Citi');
    await fireEvent.changeText(screen.getByLabelText('Last 4 digits'), '1234');
    await fireEvent.changeText(screen.getByLabelText('Statement day'), '18');
    expect(addButton().props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByLabelText('Bill due day'), '32');
    expect(addButton().props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByLabelText('Bill due day'), '8');
    expect(addButton().props.accessibilityState.disabled).toBe(false);

    stub.respond('account', { data: { id: 9 }, error: null });
    await fireEvent.press(addButton());
    expect(
      stub.chainsFor('card').find(chain => chain[0]?.[0] === 'insert')?.[0],
    ).toEqual([
      'insert',
      expect.objectContaining({ statement_day: 18, bill_due_day: 8 }),
    ]);
  });

  it('a debit card has no billing cycle', async () => {
    await open();
    await fireEvent.press(
      within(screen.getByTestId('card-kind')).getByText('Debit'),
    );
    expect(screen.queryByLabelText('Statement day')).toBeNull();
    expect(screen.queryByLabelText('Bill due day')).toBeNull();
  });

  it('shows the six themes as swatches, ringing the chosen one', async () => {
    await open();
    const swatches = within(screen.getByTestId('card-colours')).getAllByRole(
      'radio',
    );
    expect(swatches.map(s => s.props.accessibilityLabel)).toEqual([
      'Green',
      'Bronze',
      'Slate',
      'Mist',
      'Lagoon',
      'Dusk',
    ]);
    await fireEvent.press(screen.getByTestId('swatch-Dusk'));
    expect(screen.getByTestId('swatch-Dusk').props.style).toMatchObject({
      boxShadow: '0 0 0 2px #fff, 0 0 0 3.5px #1c1c1a',
    });
    expect(screen.getByTestId('swatch-Green').props.style).toBeUndefined();
  });

  it('a credit card gets a liability account of its own, then the card', async () => {
    await open();
    // The insert's row, then the lists read afresh.
    stub.respond(
      'account',
      { data: { id: 9 }, error: null },
      { data: accounts, error: null },
    );
    stub.respond(
      'card',
      { data: { ...cards[0]!, id: 7 }, error: null },
      { data: cards, error: null },
    );
    await fireEvent.changeText(screen.getByLabelText('Card name'), 'Citi');
    await fireEvent.changeText(screen.getByLabelText('Last 4 digits'), '1234');
    await fireEvent.press(screen.getByTestId('swatch-Mist'));
    await fireEvent.press(addButton());
    expect(stub.chainsFor('account').at(-2)?.[0]).toEqual([
      'insert',
      {
        name: 'Citi',
        type: 'Credit card',
        note: '•••• 1234',
        balance_cents: 0,
        is_liability: true,
      },
    ]);
    expect(
      stub.chainsFor('card').find(chain => chain[0]?.[0] === 'insert')?.[0],
    ).toEqual([
      'insert',
      expect.objectContaining({
        account_id: 9,
        bank: 'Citi',
        last4: '1234',
        card_type: 'credit',
        network: 'VISA',
        color_theme: 'Mist',
        include_in_budget: true,
        statement_day: null,
        bill_due_day: null,
      }),
    ]);
    expect(useUiStore.getState().selectedCardId).toBe(7);
  });

  it('a debit card spends from a savings account, picked in the form', async () => {
    await open();
    await fireEvent.press(
      within(screen.getByTestId('card-kind')).getByText('Debit'),
    );
    await fireEvent.press(
      within(screen.getByTestId('card-account')).getByText('UOB One'),
    );
    await fireEvent.changeText(screen.getByLabelText('Card name'), 'UOB');
    await fireEvent.changeText(screen.getByLabelText('Last 4 digits'), '5555');
    await fireEvent.press(addButton());
    expect(
      stub.chainsFor('account').some(chain => chain[0]?.[0] === 'insert'),
    ).toBe(false);
    expect(
      stub.chainsFor('card').find(chain => chain[0]?.[0] === 'insert')?.[0],
    ).toEqual([
      'insert',
      expect.objectContaining({
        account_id: 2,
        card_type: 'debit',
        include_in_budget: false,
      }),
    ]);
  });
});

describe('mobile', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'ios'));

  it('stacks the page in the design’s order', async () => {
    await draw();
    const order = [
      'settings-profile',
      'card-fan',
      'card-detail',
      'settings-nav',
      'settings-panel',
      'share-card',
    ];
    expect(
      testIDsInOrder(screen.getByTestId('settings-column')).filter(id =>
        order.includes(id),
      ),
    ).toEqual(order);
    expect(screen.getByTestId('share-owed')).toBeTruthy();
  });

  it('230px cards over a 128px span', async () => {
    await draw();
    expect(classes(card(1))).toContain('ios:w-[230px]');
    expect([1, 2, 3].map(id => place(id).left)).toEqual([64, 8, 120]);
  });

  it('swiping brings the next card forward, and back', async () => {
    await draw();
    // Card 1 in front, card 3 to its right, card 2 to its left.
    const swipe = (translationX: number) =>
      act(() =>
        fireGestureHandler(getByGestureTestId('card-fan-swipe'), [
          { state: State.BEGAN, translationX: 0 },
          { state: State.ACTIVE, translationX },
          { state: State.END, translationX },
        ]),
      );
    await swipe(-80);
    expect(useUiStore.getState().selectedCardId).toBe(3);
    await swipe(-20);
    expect(useUiStore.getState().selectedCardId).toBe(3);
    await swipe(80);
    expect(useUiStore.getState().selectedCardId).toBe(1);
  });

  it('the nav is a row of chips, the categories two tiles to a row', async () => {
    await draw();
    expect(screen.getByTestId('settings-nav').props.horizontal).toBe(true);
    await fireEvent.press(screen.getByTestId('settings-nav-expenditure'));
    const rows = within(
      screen.getByTestId('category-grid-expense'),
    ).getAllByTestId('grid-row');
    expect(rows.map(r => r.children.length)).toEqual([2, 2, 2]);
  });
});
