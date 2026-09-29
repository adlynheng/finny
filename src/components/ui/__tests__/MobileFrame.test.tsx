import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { MobileFrame } from '@/components/ui/MobileFrame';
import { classes } from '../../../../test/classes';

it('draws the dot grid, the status bar inset and a 56pt header with the brand', async () => {
  await render(
    <MobileFrame bar={<Text>bar</Text>}>
      <Text>page</Text>
    </MobileFrame>,
  );
  expect(screen.getByTestId('dot-grid')).toBeTruthy();
  expect(classes(screen.getByTestId('mobile-frame-header'))).toEqual(
    expect.arrayContaining(['h-mobile-header', 'px-mobile-x']),
  );
  expect(screen.getByTestId('app-mark')).toBeTruthy();
  expect(screen.getByText('Finny')).toBeTruthy();
  expect(screen.getByText('page')).toBeTruthy();
  expect(screen.getByText('bar')).toBeTruthy();
});
