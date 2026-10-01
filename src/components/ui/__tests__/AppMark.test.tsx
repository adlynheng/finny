import { render, screen } from '@testing-library/react-native';

import { AppMark } from '@/components/ui/AppMark';

it('draws the Finny F on the tile, 22pt tall at its 111:148 ratio', async () => {
  await render(<AppMark />);
  const logo = screen.getByTestId('finny-logo');
  expect(logo.props.height).toBe(22);
  expect(logo.props.width).toBe(16.5);
});
