import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Rings } from '@/components/charts/Rings';
import { Icon } from '@/components/icons/Icon';
import { ideaIcons, tabIcons } from '@/components/icons/registry';
import { Glass } from '@/components/ui/Glass';
import { GradientCard } from '@/components/ui/GradientCard';
import { tokens } from '@/theme/tokens';
import {
  healthScores,
  ideasFor,
  overallScore,
  verdict,
  type Idea,
} from '@/utils/derive/ideas';
import { formatTime } from '@/utils/format/date';
import type { Book } from './useTradingBook';

const METRICS = [
  { key: 'diversification', label: 'Diversification', dot: 'size-[8px]' },
  { key: 'riskBalance', label: 'Risk balance', dot: 'size-[6px]' },
  { key: 'goalPace', label: 'Goal pace', dot: 'size-[4px]' },
] as const;

/**
 * The blue-grey card: three health scores on the rings with the overall in
 * the middle, a verdict, and "Today's ideas", all computed from the current
 * book. Ask Finny has no chat to open in this build, so its button is shown
 * faded and does nothing.
 */
export function PortfolioHealthCard({
  book,
  animate = true,
}: {
  book: Book;
  animate?: boolean;
}) {
  const mobile = Platform.OS === 'ios';
  const scores = healthScores(book.holdings, book.totals);
  const ringScores = METRICS.map(m => scores[m.key]);
  const ideas = ideasFor(book.holdings, book.totals, book.idle);

  const list = ideas.map(idea => <IdeaCard key={idea.tag} idea={idea} />);

  return (
    <GradientCard
      testID="health-card"
      gradient="portfolioHealth"
      className="flex-1 ios:flex-none"
    >
      <View className="flex-row items-start justify-between gap-x-[8px]">
        <View className="gap-y-[2px]">
          <Text className="font-sans text-[13px] text-white">
            Portfolio health
          </Text>
          <Text
            testID="health-updated"
            className="font-sans text-[11px] text-white opacity-90"
          >
            AI review
            {book.quotedAt ? ` · updated ${formatTime(book.quotedAt)}` : ''}
          </Text>
        </View>
        <Pressable
          testID="ask-finny"
          accessibilityRole="button"
          accessibilityLabel="Ask Finny"
          accessibilityState={{ disabled: true }}
          disabled
          className="flex-row items-center gap-x-[7px] rounded-7 bg-white px-[12px] py-[7px] opacity-disabled ios:h-[38px] ios:rounded-9 ios:px-[13px] ios:py-0"
        >
          <Icon
            path={tabIcons.finny}
            size={12}
            color={tokens.colors.ink}
            strokeWidth={1.2}
          />
          <Text className="font-sans text-[12px] text-ink ios:text-[13px]">
            Ask Finny
          </Text>
          {!mobile && (
            <Svg width={9} height={9} viewBox="0 0 10 10">
              <Path
                d="M3 7l4-4M4 3h3v3"
                stroke={tokens.colors.ink}
                strokeWidth={1.2}
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          )}
        </Pressable>
      </View>

      <View className="mt-[4px] flex-row items-center gap-x-[18px] ios:mt-[10px] ios:gap-x-[16px]">
        <View className="size-[128px] ios:size-[112px]">
          <Rings testID="health-rings" scores={ringScores} animate={animate} />
        </View>
        <View className="min-w-0 gap-y-[9px] ios:flex-1">
          {METRICS.map(m => (
            <View
              key={m.key}
              className="flex-row items-center gap-x-[10px] ios:gap-x-[8px]"
            >
              <View className="size-[14px] items-center justify-center rounded-full border border-white/70">
                <View className={`${m.dot} rounded-full bg-white`} />
              </View>
              <Text
                numberOfLines={1}
                className="shrink font-sans text-[13px] text-white"
              >
                {m.label}
              </Text>
              <Text
                testID={`health-${m.key}`}
                className="ml-auto pl-[10px] font-sans text-[13px] tabular-nums text-white ios:pl-0"
              >
                {scores[m.key]}
              </Text>
            </View>
          ))}
          <Glass
            testID="health-verdict"
            recipe="onGradientTray"
            radius={6}
            className="mt-[2px] self-start px-[10px] py-[5px] ios:mt-0"
          >
            <Text className="font-sans text-[11px] text-white">
              {verdict(overallScore(ringScores))}
            </Text>
          </Glass>
        </View>
      </View>

      <View className="mt-[10px] flex-row items-baseline justify-between ios:mt-[16px]">
        <Text className="font-sans text-[12px] text-white">
          Today&apos;s ideas
        </Text>
        <Text className="font-sans text-[11px] text-white opacity-90">
          Not financial advice
        </Text>
      </View>
      {mobile ? (
        <View className="mt-[8px] gap-y-[4px]">{list}</View>
      ) : (
        <ScrollView
          className="mt-[8px] min-h-0 flex-1"
          contentContainerClassName="gap-y-[4px]"
          showsVerticalScrollIndicator={false}
        >
          {list}
        </ScrollView>
      )}
    </GradientCard>
  );
}

function IdeaCard({ idea }: { idea: Idea }) {
  return (
    <Glass
      testID={`idea-${idea.tag}`}
      recipe="onGradient"
      radius={8}
      className="flex-row gap-x-[12px] px-[12px] py-[10px] ios:py-[12px]"
    >
      <View className="size-[28px] items-center justify-center rounded-8 bg-white/[.14]">
        <Icon
          path={ideaIcons[idea.tag]}
          size={14}
          color={tokens.colors.white}
        />
      </View>
      <View className="min-w-0 flex-1 gap-y-[3px] ios:gap-y-[4px]">
        <View className="flex-row items-center gap-x-[8px]">
          <Text className="shrink font-sans text-[13px] text-white ios:text-[14px]">
            {idea.title}
          </Text>
          <View className="ml-auto flex-row items-center gap-x-[5px]">
            <View className="size-[5px] rounded-full bg-lime" />
            <Text className="font-sans text-[10px] uppercase tracking-[0.04em] text-white">
              {idea.tag}
            </Text>
          </View>
        </View>
        <Text className="font-sans text-[12px] leading-[17px] text-white opacity-[.92] ios:leading-[17.4px]">
          {idea.body}
        </Text>
      </View>
    </Glass>
  );
}
