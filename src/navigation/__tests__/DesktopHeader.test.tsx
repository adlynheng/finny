import { fireEvent, render, screen } from '@testing-library/react-native';

import { classes } from '../../../test/classes';
import { DesktopHeader } from '../DesktopHeader';
import { SCREENS } from '../routes';

const draw = (current = 'Overview', onSelect = jest.fn()) =>
  render(<DesktopHeader current={current} onSelect={onSelect} />);

it('shows the mark and wordmark, the five tabs and the profile button', async () => {
  await draw();
  expect(screen.getByTestId('app-mark')).toBeTruthy();
  expect(screen.getByText('Finny')).toBeTruthy();
  for (const { name, label } of SCREENS) {
    expect(screen.getByTestId(`tab-${name}`)).toHaveTextContent(label);
  }
  expect(screen.getByTestId('profile-button')).toBeTruthy();
});

it('is the nav size of Segmented, in navPill glass', async () => {
  await draw('Trading');
  expect(classes(screen.getByTestId('tab'))).toContain('p-[4px]');
  expect(classes(screen.getByText('Trading'))).toContain('text-ink');
  expect(classes(screen.getByText('Overview'))).toEqual(
    expect.arrayContaining(['text-muted', 'group-hover:text-ink']),
  );
});

it('selects a tab when pressed', async () => {
  const onSelect = jest.fn();
  await draw('Overview', onSelect);
  await fireEvent.press(screen.getByTestId('tab-Planner'));
  expect(onSelect).toHaveBeenCalledWith('Planner');
});

it('centres the pill 20px from the top, across the header', async () => {
  await draw();
  const wrapper = screen.getByTestId('tab').parent!.parent!;
  expect(wrapper.props.className).toBe(
    'absolute inset-x-0 top-[20px] items-center',
  );
  expect(wrapper.props.pointerEvents).toBe('box-none');
});
