import { render, screen } from '@testing-library/react-native';
import App from '@/App';

test('renders the app root with the NativeWind probe', async () => {
  await render(<App />);
  expect(screen.getByTestId('nativewind-probe')).toBeTruthy();
});
