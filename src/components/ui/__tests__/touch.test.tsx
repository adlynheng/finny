import { Platform } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { Button } from '../Button';
import { ChipRow } from '../ChipRow';
import { Toggle } from '../Toggle';
import { touchSlop } from '../touch';

afterEach(() => jest.restoreAllMocks());

describe('on iOS', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'ios'));

  it('grows a control to a 44pt touch target, splitting the difference', () => {
    expect(touchSlop(38)).toEqual({ top: 3, bottom: 3, left: 0, right: 0 });
    expect(touchSlop(24, 40)).toEqual({
      top: 10,
      bottom: 10,
      left: 2,
      right: 2,
    });
    expect(touchSlop(33)).toEqual({ top: 6, bottom: 6, left: 0, right: 0 });
    expect(touchSlop(48, 48)).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });

  it('gives the small button, the chips and the switch a 44pt target', async () => {
    await render(
      <>
        <Button
          testID="sm"
          variant="primary"
          size="sm"
          label="Add"
          onPress={() => {}}
        />
        <ChipRow
          options={[{ value: 'a', label: 'A' }]}
          value="a"
          onChange={() => {}}
        />
        <Toggle
          testID="switch"
          value
          accessibilityLabel="On"
          onChange={() => {}}
        />
      </>,
    );
    expect(screen.getByTestId('sm').props.hitSlop).toEqual(touchSlop(38));
    expect(screen.getByLabelText('A').props.hitSlop).toEqual(touchSlop(38));
    expect(screen.getByTestId('switch').props.hitSlop).toEqual(
      touchSlop(24, 40),
    );
  });
});

it('leaves the Mac’s pointer targets alone', () => {
  jest.replaceProperty(Platform, 'OS', 'macos');
  expect(touchSlop(38)).toBeUndefined();
});
