import { Platform, ScrollView, View } from 'react-native';

import { PortfolioHealthCard } from './PortfolioHealthCard';
import { TradingHero } from './TradingHero';
import { TradingPanel } from './TradingPanel';
import { useTradingBook } from './useTradingBook';

/**
 * The Trading page. On desktop it is the design's grid, 'hero health' over
 * 'pos pos', columns 1.7fr 1fr and rows 1fr 1.08fr, as flex rows and cells
 * with a basis of 0 (the gap comes off first, as a grid's does). The hero has
 * no card of its own, so the gap beside it is the frame's padding: the health
 * card sits as far from the hero as from the window's edge.
 *
 * On iOS the pieces stack in one scrolling column (FinnyTradingMobile): the
 * hero with its chart, range and strip, the health card, then the panel.
 */
export function TradingScreen() {
  const book = useTradingBook();

  if (Platform.OS !== 'macos') {
    return (
      <ScrollView
        testID="trading-column"
        contentContainerClassName="gap-y-[12px] px-mobile-x pb-mobile-bottom pt-mobile-top"
        showsVerticalScrollIndicator={false}
      >
        {book && (
          <>
            <TradingHero book={book} />
            <PortfolioHealthCard book={book} />
            <TradingPanel book={book} />
          </>
        )}
      </ScrollView>
    );
  }
  return (
    <View testID="trading-grid" className="flex-1 gap-y-frame-gap">
      {book && (
        <>
          <View className="min-h-0 grow basis-0 flex-row gap-x-frame-x">
            <View
              testID="trading-hero-cell"
              className="min-w-0 grow-[1.7] basis-0"
            >
              <TradingHero book={book} />
            </View>
            <View testID="trading-health-cell" className="min-w-0 grow basis-0">
              <PortfolioHealthCard book={book} />
            </View>
          </View>
          <View
            testID="trading-panel-cell"
            className="min-h-0 grow-[1.08] basis-0"
          >
            <TradingPanel book={book} />
          </View>
        </>
      )}
    </View>
  );
}
