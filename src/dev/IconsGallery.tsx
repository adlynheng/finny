/**
 * Temporary: every Task 36 registry icon in the design's 30px tile, with its
 * key, so the set can be checked against the design by eye. Mounted from
 * SurfacesGallery until the pages exist (Phase H); delete it then.
 */

import { Text, View } from 'react-native';
import { Icon } from '@/components/icons/Icon';
import {
  accountTypeIcons,
  depositIcons,
  expenseIcons,
  ideaIcons,
  tabIcons,
  transactionKindIcons,
} from '@/components/icons/registry';

const sets: [string, Record<string, string>][] = [
  ['Expense categories', expenseIcons],
  ['Deposit categories', depositIcons],
  ['Transaction kinds', transactionKindIcons],
  ['Account types', accountTypeIcons],
  ['Trading ideas', ideaIcons],
  ['Mobile tabs', tabIcons],
];

export function IconsGallery() {
  return (
    <View className="gap-y-3">
      {sets.map(([title, registry]) => (
        <View key={title} className="gap-y-2">
          <Text className="font-sans text-[11px] text-muted">{title}</Text>
          <View className="flex-row flex-wrap gap-[10px]">
            {Object.entries(registry).map(([key, path]) => (
              <View key={key} className="w-[76px] items-center gap-[4px]">
                <View className="size-[30px] items-center justify-center rounded-8 bg-white">
                  <Icon path={path} size={15} />
                </View>
                <Text
                  numberOfLines={1}
                  className="font-sans text-[10px] text-muted"
                >
                  {key}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
