import { Platform } from 'react-native';
import { screen } from '@testing-library/react-native';

import { OverviewScreen } from '../OverviewScreen';
import { classes } from '../../../../test/classes';
import { renderWithClient } from '../../../../test/queryTestUtils';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

afterEach(() => jest.restoreAllMocks());

type Node = { props: { testID?: string }; children: (Node | string)[] };

/** Every testID under `node`, in document order. */
function testIDsIn(node: Node): string[] {
  return [
    ...(node.props.testID ? [node.props.testID] : []),
    ...node.children.flatMap(c => (typeof c === 'string' ? [] : testIDsIn(c))),
  ];
}

const flex = (testID: string) =>
  classes(screen.getByTestId(testID)).filter(c => /^(grow|basis)/.test(c));

describe('on macOS', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'macos'));

  it('lays out hero and share over history, this month and goals', async () => {
    await renderWithClient(<OverviewScreen />);

    // 1.7fr 1fr 1fr: the hero spans two columns and the gap between them.
    expect(flex('overview-hero')).toEqual(['grow-[2.7]', 'basis-frame-gap']);
    expect(flex('overview-share')).toEqual(['grow', 'basis-0']);
    expect(flex('overview-history')).toEqual(['grow-[1.7]', 'basis-0']);
    expect(flex('overview-month')).toEqual(['grow', 'basis-0']);
    expect(flex('overview-goals')).toEqual(['grow', 'basis-0']);
    expect(screen.getByTestId('net-worth-hero')).toBeTruthy();
    expect(screen.getByTestId('overview-sphere')).toBeTruthy();
  });
});

describe('on iOS', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'ios'));

  it('stacks every card in one scrolling column, without the desktop grid', async () => {
    await renderWithClient(<OverviewScreen />);

    const column = screen.getByTestId('overview-column');
    const order = [
      'net-worth-hero',
      'overview-sphere',
      'asset-chips',
      'month-card',
      'history-card',
      'share-card',
      'goals-card',
    ];
    expect(testIDsIn(column).filter(id => order.includes(id))).toEqual(order);
    expect(screen.queryByTestId('overview-grid')).toBeNull();
  });

  it('clears the tab bar and squares the sphere across the column', async () => {
    await renderWithClient(<OverviewScreen />);

    const container =
      screen.getByTestId('overview-column').props.contentContainerClassName;
    expect(container.split(' ')).toEqual(
      expect.arrayContaining([
        'gap-y-[12px]',
        'px-mobile-x',
        'pb-mobile-bottom',
      ]),
    );
    expect(classes(screen.getByTestId('overview-sphere'))).toEqual(
      expect.arrayContaining(['aspect-square', 'w-full']),
    );
  });
});
