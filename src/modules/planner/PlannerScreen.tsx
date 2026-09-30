import { Platform, ScrollView, View } from 'react-native';

import { useThrottled } from '@/hooks/useThrottled';
import { CommitmentsCard } from './CommitmentsCard';
import { PlanHero } from './PlanHero';
import { PlannerGoalsCard } from './PlannerGoalsCard';
import { usePlanner } from './usePlanner';

/** How often the costly views catch up with a drag. */
const SETTLE_MS = 80;

/**
 * The Goals & Planner page. On desktop it is the design's grid, 'hero hero
 * hero rec' over 'goals goals goals rec', columns 1.25fr 1fr 1fr 1.15fr and
 * rows 392px 1fr: a left column spanning three grid columns (so it starts
 * from two gaps) holding the hero over the goals, beside the fixed
 * commitments at full height.
 *
 * On iOS the pieces stack in one scrolling column (FinnyPlannerMobile): the
 * plan's summary, the dial, the sliders, the goals, then the fixed
 * commitments.
 */
export function PlannerScreen() {
  const planner = usePlanner();
  // The dial and the goals redraw a dozen times a second behind a drag,
  // leaving every frame to the slider and the figures it moves (see PlanHero).
  const settled = useThrottled(planner, SETTLE_MS);

  if (Platform.OS !== 'macos') {
    return (
      <ScrollView
        testID="planner-column"
        contentContainerClassName="gap-y-[12px] px-mobile-x pb-mobile-bottom pt-mobile-top"
        showsVerticalScrollIndicator={false}
      >
        {planner && (
          <>
            <PlanHero planner={planner} settled={settled ?? planner} />
            <PlannerGoalsCard planner={settled ?? planner} />
            <CommitmentsCard
              commitments={planner.commitments}
              fixedCents={planner.fixedCents}
              grossCents={planner.grossCents}
            />
          </>
        )}
      </ScrollView>
    );
  }
  return (
    <View testID="planner-grid" className="flex-1 flex-row gap-x-frame-gap">
      {planner && (
        <>
          <View className="min-w-0 grow-[3.25] basis-[28px] gap-y-frame-gap">
            <View testID="planner-hero" className="h-planner-row">
              <PlanHero planner={planner} settled={settled ?? planner} />
            </View>
            <View testID="planner-goals" className="min-h-0 flex-1">
              <PlannerGoalsCard planner={settled ?? planner} />
            </View>
          </View>
          <View testID="planner-rec" className="min-w-0 grow-[1.15] basis-0">
            <CommitmentsCard
              commitments={planner.commitments}
              fixedCents={planner.fixedCents}
              grossCents={planner.grossCents}
            />
          </View>
        </>
      )}
    </View>
  );
}
