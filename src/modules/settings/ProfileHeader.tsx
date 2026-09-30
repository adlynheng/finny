import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icons/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { Glass } from '@/components/ui/Glass';
import { noFocusRing } from '@/components/ui/Input';
import { useUpdateSettings } from '@/hooks/useSettings';
import { tokens } from '@/theme/tokens';
import type { SettingsRow } from '@/types/domain';
import { plural } from './useSettingsData';

/**
 * The hero's left column (the mobile page's header): the Settings heading,
 * the avatar beside the user's name, which edits in place, and email, and
 * three meta chips — cards, accounts, and region and currency.
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
      <Text
        accessibilityRole="header"
        className="font-sans text-[40px] font-normal leading-[40px] tracking-[-0.02em] text-ink ios:text-[32px] ios:leading-[32px]"
      >
        Settings
      </Text>
      <View className="mt-auto flex-row items-center gap-x-[14px] ios:mt-0 ios:gap-x-[12px]">
        <Avatar name={settings.name} size="lg" />
        <View className="min-w-0 flex-1 gap-y-[2px]">
          <NameField name={settings.name} />
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

/** Not in the design: a pencil beside the name says it can be edited. */
const PENCIL = 'M10.5 2.5l3 3-8 8h-3v-3z M9 4l3 3';

const NAME_TEXT = 'font-sans text-[20px] text-ink ios:text-[19px]';

/**
 * The user's name, which a press turns into a field. Return or leaving the
 * field saves it; an empty name is not saved, and the old one comes back.
 */
function NameField({ name: saved }: { name: string }) {
  const update = useUpdateSettings();
  const [draft, setDraft] = useState<string | null>(null);
  // The new name while it saves, so the old one does not flash back.
  const name = (update.isPending && update.variables.name) || saved;

  if (draft === null) {
    return (
      <Pressable
        testID="settings-name"
        accessibilityRole="button"
        accessibilityLabel="Edit name"
        onPress={() => setDraft(name)}
        className="group flex-row items-center gap-x-[8px] self-start"
      >
        <Text numberOfLines={1} className={`shrink ${NAME_TEXT}`}>
          {name}
        </Text>
        <View className="opacity-60 group-hover:opacity-100">
          <Icon path={PENCIL} size={12} color={tokens.colors.muted} />
        </View>
      </Pressable>
    );
  }
  const save = () => {
    const next = draft.trim();
    setDraft(null);
    if (next && next !== name) {
      update.mutate({ name: next });
    }
  };
  return (
    <TextInput
      testID="settings-name-input"
      accessibilityLabel="Name"
      autoFocus
      value={draft}
      onChangeText={setDraft}
      onSubmitEditing={save}
      onBlur={save}
      returnKeyType="done"
      {...noFocusRing}
      className={`border-b border-ink/20 p-0 ${NAME_TEXT}`}
    />
  );
}
