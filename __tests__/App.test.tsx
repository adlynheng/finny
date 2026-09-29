import { Platform } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import App from '@/App';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: null },
        error: null,
      })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

afterEach(() => jest.restoreAllMocks());

test('renders the app inside the phone frame, with the dot grid behind it', async () => {
  await render(<App />);
  expect(screen.getByTestId('mobile-frame')).toBeTruthy();
  expect(screen.getByTestId('dot-grid')).toBeTruthy();
  expect(screen.getByText('Finny')).toBeTruthy();
});

test('renders the app inside the desktop frame on macOS', async () => {
  jest.replaceProperty(Platform, 'OS', 'macos');
  await render(<App />);
  expect(screen.getByTestId('app-frame')).toBeTruthy();
  expect(screen.getByText('Finny')).toBeTruthy();
});

test('asks to sign in when there is no session', async () => {
  await render(<App />);
  expect(await screen.findByText('Sign in')).toBeTruthy();
});
