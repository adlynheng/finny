import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';

import { touchSlop } from '@/components/ui/touch';
import { supabase } from '@/lib/supabase';

type Props = {
  /** The signed-in app, or a function of the current session that returns it. */
  children: ReactNode | ((session: Session) => ReactNode);
  /** Wraps the loading and sign-in states, which the signed-in app frames itself. */
  frame?: (content: ReactNode) => ReactNode;
};

/**
 * Shows the app only while there is a Supabase session, restored from the Keychain at launch or
 * created by signing in. The design has no sign-in screen, so this form is deliberately plain;
 * sign-ups are disabled, so it only ever signs Adlyn in.
 */
export function SessionGate({ children, frame = content => content }: Props) {
  // undefined while the stored session is still being read.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(current => (current === undefined ? data.session : current));
      }
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_OUT') {
        // Nothing read in the old session should show in the next one.
        queryClient.clear();
      }
      setSession(next);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  if (session === undefined) {
    return frame(
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>,
    );
  }
  if (!session) {
    return frame(<SignInForm />);
  }
  return <>{typeof children === 'function' ? children(session) : children}</>;
}

function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    setError(null);
    const result = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
    }
  }

  // Height comes from line height plus equal vertical padding, not a fixed `h-*`: a macOS text
  // field draws its text at the top of the box instead of centring it.
  const inputClass =
    'rounded-8 border border-canvas-alt bg-white px-3 py-[10px] font-sans text-[14px] leading-[18px] text-ink';

  return (
    <View className="flex-1 items-center justify-center">
      <View className="w-72 gap-y-3">
        <TextInput
          accessibilityLabel="Email"
          placeholder="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          className={inputClass}
        />
        <TextInput
          accessibilityLabel="Password"
          placeholder="Password"
          // react-native-macos's secure field never reports what is typed on this macOS: AppKit only
          // lets a real NSSecureTextField receive its editor's changes, which RN's field is not. So
          // the password is visible on the Mac, where Adlyn signs in once (build plan Task 16).
          secureTextEntry={Platform.OS !== 'macos'}
          autoComplete="current-password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={signIn}
          className={inputClass}
        />
        {error ? (
          <Text className="font-sans text-[12px] text-danger">{error}</Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={signIn}
          hitSlop={touchSlop(40)}
          className="h-10 items-center justify-center rounded-8 bg-ink"
        >
          <Text className="font-sans text-[14px] font-medium text-white">
            Sign in
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
