import { Platform } from 'react-native';
import { screen } from '@testing-library/react-native';

import { OverviewScreen } from '../OverviewScreen';
import { classes } from '../../../../test/classes';
import { renderWithClient } from '../../../../test/queryTestUtils';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

afterEach(() => jest.restoreAllMocks());

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

  it('shows the hero without the desktop grid', async () => {
    await renderWithClient(<OverviewScreen />);

    expect(screen.getByTestId('net-worth-hero')).toBeTruthy();
    expect(screen.queryByTestId('overview-grid')).toBeNull();
  });
});
