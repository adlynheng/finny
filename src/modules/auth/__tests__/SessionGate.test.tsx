import { Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { SessionGate } from '../SessionGate';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

const auth = supabase.auth as jest.Mocked<typeof supabase.auth>;

const session = { user: { email: 'adlyn@example.com' } } as Session;

let emit: (event: AuthChangeEvent, next: Session | null) => void;

function mockStoredSession(stored: Session | null) {
  auth.getSession.mockResolvedValue({ data: { session: stored }, error: null } as never);
  auth.onAuthStateChange.mockImplementation(callback => {
    emit = (event, next) => {
      callback(event, next);
    };
    return { data: { subscription: { unsubscribe: jest.fn() } } } as never;
  });
}

async function renderGate() {
  await render(
    <SessionGate>
      <Text>Signed-in content</Text>
    </SessionGate>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('shows the app when a session was restored from the Keychain', async () => {
  mockStoredSession(session);
  await renderGate();

  expect(await screen.findByText('Signed-in content')).toBeTruthy();
  expect(screen.queryByText('Sign in')).toBeNull();
});

it('shows the sign-in form when there is no stored session', async () => {
  mockStoredSession(null);
  await renderGate();

  expect(await screen.findByText('Sign in')).toBeTruthy();
  expect(screen.queryByText('Signed-in content')).toBeNull();
});

it('signs in with the typed email and password, then shows the app', async () => {
  mockStoredSession(null);
  auth.signInWithPassword.mockResolvedValue({ data: {}, error: null } as never);
  await renderGate();

  await fireEvent.changeText(await screen.findByLabelText('Email'), ' adlyn@example.com ');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'secret');
  await fireEvent.press(screen.getByText('Sign in'));

  expect(auth.signInWithPassword).toHaveBeenCalledWith({
    email: 'adlyn@example.com',
    password: 'secret',
  });

  await act(async () => emit('SIGNED_IN', session));
  expect(screen.getByText('Signed-in content')).toBeTruthy();
});

it('shows the error when sign-in fails', async () => {
  mockStoredSession(null);
  auth.signInWithPassword.mockResolvedValue({
    data: {},
    error: { message: 'Invalid login credentials' },
  } as never);
  await renderGate();

  await fireEvent.changeText(await screen.findByLabelText('Email'), 'adlyn@example.com');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'wrong');
  await fireEvent.press(screen.getByText('Sign in'));

  expect(screen.getByText('Invalid login credentials')).toBeTruthy();
});

it('returns to the sign-in form when the session ends', async () => {
  mockStoredSession(session);
  await renderGate();
  await screen.findByText('Signed-in content');

  await act(async () => emit('SIGNED_OUT', null));

  expect(screen.getByText('Sign in')).toBeTruthy();
});

it('passes the session to a render function', async () => {
  mockStoredSession(session);
  await render(<SessionGate>{current => <Text>{current.user.email}</Text>}</SessionGate>);

  expect(await screen.findByText('adlyn@example.com')).toBeTruthy();
});

it('hides the password on iOS', async () => {
  mockStoredSession(null);
  await renderGate();

  expect((await screen.findByLabelText('Password')).props.secureTextEntry).toBe(true);
});
