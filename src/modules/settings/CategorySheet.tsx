import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/icons/Icon';
import { categoryIcon, categoryIconKeys } from '@/components/icons/registry';
import { cx } from '@/components/ui/cardChrome';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { useDeleteCategory, useUpsertCategory } from '@/hooks/useCategories';
import { tokens } from '@/theme/tokens';
import type { CategoryKind, CategoryRow } from '@/types/domain';

/** The drawer's words, by kind. */
const COPY: Record<
  CategoryKind,
  { noun: string; placeholder: string; note: string }
> = {
  expense: {
    noun: 'category',
    placeholder: 'e.g. Pets',
    note: 'Categories appear when you add transactions and recurring charges.',
  },
  deposit: {
    noun: 'deposit category',
    placeholder: 'e.g. Freelance',
    note: 'Deposit categories tag money coming in, like salary, dividends and refunds.',
  },
};

/** Postgres's unique-violation code: the name is already a category's. */
const TAKEN = '23505';

/**
 * The category drawer: a name and an icon from the kind's own set, the
 * chosen one ink with a lime glyph. No monthly limit, as v2 has none.
 * Editing adds Remove category, which asks first. Mount it only while open.
 */
export function CategorySheet({
  kind,
  category,
  onClose,
}: {
  kind: CategoryKind;
  /** The category to edit, or null for a new one. */
  category: CategoryRow | null;
  onClose: () => void;
}) {
  const upsert = useUpsertCategory();
  const remove = useDeleteCategory();
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(category?.name ?? '');
  const keys = categoryIconKeys(kind);
  const [icon, setIcon] = useState(
    category?.icon && keys.includes(category.icon) ? category.icon : 'Other',
  );
  const copy = COPY[kind];
  const valid = name.trim() !== '';
  const title = `${category ? 'Edit' : 'New'} ${copy.noun}`;

  const save = () => {
    if (!valid) {
      return;
    }
    const fields = { name: name.trim(), icon, kind };
    upsert.mutate(category ? { id: category.id, ...fields } : fields, {
      onSuccess: onClose,
    });
  };
  const taken = (upsert.error as { code?: string } | null)?.code === TAKEN;

  return (
    <Sheet
      open
      onClose={onClose}
      title={title[0]!.toUpperCase() + title.slice(1)}
      actions={{
        primary: {
          label: category ? 'Save changes' : 'Add',
          onPress: save,
          disabled: !valid || upsert.isPending,
        },
        danger: category
          ? {
              label: 'Remove category',
              onPress: () => setConfirming(true),
              disabled: remove.isPending,
            }
          : undefined,
      }}
    >
      <Input
        testID="category-name"
        label="Name"
        placeholder={copy.placeholder}
        value={name}
        onChangeText={setName}
      />
      <FormField label="Icon">
        <View testID="category-icons" className="flex-row flex-wrap gap-[6px]">
          {keys.map(key => {
            const on = key === icon;
            return (
              <Pressable
                key={key}
                testID={`category-icon-${key}`}
                accessibilityRole="radio"
                accessibilityLabel={key}
                accessibilityState={{ selected: on }}
                onPress={() => setIcon(key)}
                className={cx(
                  'size-[38px] items-center justify-center rounded-8 border border-ink/[.08] ios:size-[44px] ios:rounded-10',
                  on ? 'bg-ink' : 'bg-white',
                )}
              >
                <Icon
                  path={categoryIcon(kind, key)}
                  size={16}
                  strokeWidth={1.2}
                  color={on ? tokens.colors.lime : tokens.colors.ink}
                />
              </Pressable>
            );
          })}
        </View>
      </FormField>
      <Text className="font-sans text-[12px] text-muted">{copy.note}</Text>
      {(upsert.isError || remove.isError) && (
        <Text
          testID="category-error"
          className="font-sans text-[12px] text-danger"
        >
          {taken
            ? `There is already a category called “${name.trim()}”.`
            : 'Couldn’t save the category. Try again.'}
        </Text>
      )}
      {category && (
        <ConfirmDialog
          open={confirming}
          name={category.name}
          detail="Its transactions and recurring charges stay, uncategorised."
          confirmLabel="Remove category"
          onConfirm={() =>
            remove.mutate(category.id, {
              onSuccess: onClose,
              onError: () => setConfirming(false),
            })
          }
          onCancel={() => setConfirming(false)}
          pending={remove.isPending}
        />
      )}
    </Sheet>
  );
}
