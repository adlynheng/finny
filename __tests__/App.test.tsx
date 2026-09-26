import { render, screen } from '@testing-library/react-native';
import App from '@/App';

test('renders the app inside the frame, with the dot grid behind it', async () => {
  await render(<App />);
  expect(screen.getByTestId('app-frame')).toBeTruthy();
  expect(screen.getByTestId('dot-grid')).toBeTruthy();
  expect(screen.getByText('Finny')).toBeTruthy();
});
