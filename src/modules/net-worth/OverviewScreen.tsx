import { Platform, ScrollView, View } from 'react-native';

import { GradientFill } from '@/components/ui/GradientFill';
import { gradients } from '@/theme/gradients';
import { GoalsCard } from './GoalsCard';
import { HistoryCard } from './HistoryCard';
import { NetWorthHero } from './NetWorthHero';
import { OverviewSphere } from './OverviewSphere';
import { ShareOfAssetsCard } from './ShareOfAssetsCard';
import { ThisMonthCard } from './ThisMonthCard';

/**
 * The Overview page. On desktop it is the design's grid, 'hero hero share' over
 * 'hist month goals', columns 1.7fr 1fr 1fr and rows 1fr 272px, built from flex rows: the
 * hero's basis of one gap and grow of 2.7 leaves the share card exactly one column wide, the
 * same as This month and Savings goals below it. Each card sits in a plain cell that takes the
 * column's share: on the card itself, its padding would count towards its basis and skew the
 * columns.
 *
 * iOS shows the hero alone until the mobile column arrives (Task 55).
 */
export function OverviewScreen() {
  if (Platform.OS !== 'macos') {
    return (
      <ScrollView contentContainerClassName="px-mobile-x pb-mobile-bottom pt-mobile-top">
        <NetWorthHero />
      </ScrollView>
    );
  }
  return (
    <View testID="overview-grid" className="flex-1 gap-y-frame-gap">
      <View className="min-h-0 flex-1 flex-row gap-x-frame-gap">
        <View testID="overview-hero" className="grow-[2.7] basis-frame-gap">
          <View className="absolute left-hero-inset top-hero-inset z-10">
            <NetWorthHero />
          </View>
          <View
            testID="overview-sphere"
            className="absolute inset-y-0 left-hero-sphere right-0 items-center justify-center"
          >
            <View className="absolute aspect-square h-[62%]">
              <GradientFill gradient={gradients.heroGlow} />
            </View>
            <View className="aspect-square h-full max-w-full">
              <OverviewSphere />
            </View>
          </View>
        </View>
        <View testID="overview-share" className="grow basis-0">
          <ShareOfAssetsCard />
        </View>
      </View>
      <View className="h-overview-row flex-row gap-x-frame-gap">
        <View testID="overview-history" className="grow-[1.7] basis-0">
          <HistoryCard />
        </View>
        <View testID="overview-month" className="grow basis-0">
          <ThisMonthCard />
        </View>
        <View testID="overview-goals" className="grow basis-0">
          <GoalsCard />
        </View>
      </View>
    </View>
  );
}
