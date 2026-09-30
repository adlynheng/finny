import { Pressable, Text, View } from 'react-native';

import { Glass } from '@/components/ui/Glass';
import { supabase } from '@/lib/supabase';
import type { SettingsRow } from '@/types/domain';
import { plural } from './useSettingsData';

/** Up to two initials: "Wei Ling Tan" is WL, "Adlyn" is A. */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * The hero's left column (the mobile page's header): the Settings heading,
 * an avatar tile with the user's initials in lime on ink beside their name
 * and email, and three meta chips — cards, accounts, and region and currency.
 */
export function ProfileHeader({
  settings,
  cardCount,
  accountCount,
}: {
  settings: SettingsRow;
  cardCount: number;
  accountCount: number;
}) {
  const chips = [
    plural(cardCount, 'card'),
    plural(accountCount, 'account'),
    `Singapore · ${settings.base_currency}`,
  ];
  return (
    <View
      testID="settings-profile"
      className="flex-1 gap-y-[16px] pl-[6px] pt-[6px] ios:flex-none ios:gap-y-[14px] ios:px-[4px] ios:pt-0"
    >
      <View className="flex-row items-center justify-between gap-x-[10px]">
        <Text
          accessibilityRole="header"
          className="font-sans text-[40px] font-normal leading-[40px] tracking-[-0.02em] text-ink ios:text-[32px] ios:leading-[32px]"
        >
          Settings
        </Text>
        <SignOut />
      </View>
      <View className="mt-auto flex-row items-center gap-x-[14px] ios:mt-0 ios:gap-x-[12px]">
        <View className="size-[52px] items-center justify-center rounded-8 bg-ink ios:size-[48px]">
          <Text
            testID="settings-initials"
            className="font-sans text-[17px] font-medium text-lime ios:text-[16px]"
          >
            {initialsOf(settings.name)}
          </Text>
        </View>
        <View className="min-w-0 flex-1 gap-y-[2px]">
          <Text
            numberOfLines={1}
            className="font-sans text-[20px] text-ink ios:text-[19px]"
          >
            {settings.name}
          </Text>
          {settings.email ? (
            <Text
              numberOfLines={1}
              className="font-sans text-[12px] text-muted"
            >
              {settings.email}
            </Text>
          ) : null}
        </View>
      </View>
      <View className="flex-row flex-wrap gap-[8px] pb-[24px] ios:gap-[6px] ios:pb-0">
        {chips.map(chip => (
          <Glass
            key={chip}
            recipe="chip"
            radius={4}
            fill="bg-white/60"
            className="px-[8px] py-[3px]"
          >
            <Text className="font-sans text-[11px] text-muted">{chip}</Text>
          </Glass>
        ))}
      </View>
    </View>
  );
}

/**
 * Not in the design, whose Settings page has no way out: kept from the
 * stand-in page, small and muted beside the heading, until it has a home.
 */
function SignOut() {
  return (
    <Pressable
      accessibilityRole="button"
      // Local: signing out here leaves the other device signed in.
      onPress={() => supabase.auth.signOut({ scope: 'local' })}
    >
      <Text className="font-sans text-[12px] text-muted">Sign out</Text>
    </Pressable>
  );
}
