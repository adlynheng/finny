import { useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { PlusIcon } from '@/components/icons/PlusIcon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { useUiStore, type TradingTab } from '@/stores/uiStore';
import type { Holding } from '@/utils/derive/portfolio';
import { byIndustry, byType } from '@/utils/derive/portfolio';
import { formatTime } from '@/utils/format/date';
import { formatDualMoney } from '@/utils/format/money';
import { AddPositionSheet } from './AddPositionSheet';
import { PortfolioTab } from './PortfolioTab';
import { PositionsTab } from './PositionsTab';
import { SellSheet } from './SellSheet';
import type { Book } from './useTradingBook';
import { WatchlistTab } from './WatchlistTab';

const TABS = [
  { value: 'positions', label: 'Positions' },
  { value: 'watchlist', label: 'Watchlist' },
  { value: 'portfolio', label: 'Portfolio' },
] as const;

const count = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * The glass panel under the hero: Positions, Watchlist and Portfolio tabs, a
 * line about the open tab, the USD/SGD rate and when it was fetched, and Add
 * position. The Sell and Add position forms open from here.
 */
export function TradingPanel({
  book,
  animate = true,
}: {
  book: Book;
  animate?: boolean;
}) {
  const tab = useUiStore(s => s.tradingTab);
  const mode = useUiStore(s => s.tradingMode);
  const symbol = useUiStore(s => s.tradingSymbol);
  const expanded = useUiStore(s => s.expandedSymbols);
  const setUi = useUiStore(s => s.set);
  const [selling, setSelling] = useState<Holding | null>(null);
  const [adding, setAdding] = useState(false);
  const mobile = Platform.OS === 'ios';
  const click = mobile ? 'tap' : 'click';

  // The row the hero is charting: Position mode's symbol, or its first holding.
  const charted =
    mode === 'position'
      ? book.holdings.find(h => h.symbol === symbol)?.symbol ??
        book.holdings[0]?.symbol ??
        null
      : null;

  const account = book.idle?.accountName;
  const realised = book.sales.length
    ? ` · realised ${
        formatDualMoney(book.realisedCents, book.rate, {
          currency: 'SGD',
          signed: true,
        }).primary
      }`
    : '';
  const line = {
    positions: `${count(book.holdings.length, 'holding', 'holdings')}${
      account ? ` · ${account}` : ''
    }${realised} · ${click} a row for lots`,
    watchlist: `${count(
      book.watched.length,
      'symbol',
      'symbols',
    )} · ${click} a held symbol to chart it`,
    portfolio: `${count(
      byType(book.holdings).length,
      'instrument type',
      'instrument types',
    )} · ${count(byIndustry(book.holdings).length, 'industry', 'industries')}`,
  }[tab];

  const tabs = (
    <Segmented
      testID="trading-tabs"
      size="tabs"
      options={TABS}
      value={tab}
      onChange={t => setUi({ tradingTab: t as TradingTab })}
    />
  );
  const countLine = (
    <Text
      testID="trading-tab-line"
      // Mobile has the width to itself, under the rate: it wraps there.
      numberOfLines={mobile ? undefined : 1}
      className="shrink font-sans text-[11px] text-muted"
    >
      {line}
    </Text>
  );
  const time = book.rateAt ? formatTime(book.rateAt) : null;
  const add = (
    <Button
      testID="add-position"
      variant="primary"
      size="sm"
      label="Add position"
      icon={plus}
      onPress={() => setAdding(true)}
      className="h-[28px] px-[11px] py-0 ios:h-[40px] ios:rounded-10 ios:px-[14px]"
    />
  );

  return (
    <Card
      testID="trading-panel"
      className="flex-1 pb-[10px] pt-[14px] ios:flex-none ios:px-[14px] ios:pb-[14px] ios:pt-[14px]"
    >
      {mobile ? (
        <>
          {tabs}
          <View className="mt-[10px] flex-row items-center justify-between gap-x-[8px]">
            <View className="min-w-0 shrink gap-y-[2px]">
              <View className="flex-row items-center gap-x-[6px]">
                <Text className="font-sans text-[12px] text-muted">
                  USD/SGD
                </Text>
                <Text
                  testID="trading-rate"
                  className="font-sans text-[12px] tabular-nums text-ink"
                >
                  {book.rate.toFixed(4)}
                </Text>
                {time && (
                  <>
                    <View className="size-[5px] rounded-full bg-lime-dark" />
                    <Text className="font-sans text-[11px] text-muted">
                      {time}
                    </Text>
                  </>
                )}
              </View>
              {countLine}
            </View>
            {add}
          </View>
        </>
      ) : (
        <View className="flex-row items-center justify-between gap-x-[8px]">
          <View className="min-w-0 shrink flex-row items-center gap-x-[12px]">
            {tabs}
            {countLine}
          </View>
          <View className="flex-row items-center gap-x-[8px]">
            <View className="h-[28px] flex-row items-center gap-x-[8px] rounded-6 bg-ink/[.04] px-[10px]">
              <Text className="font-sans text-[12px] text-muted">USD/SGD</Text>
              <Text
                testID="trading-rate"
                className="font-sans text-[12px] tabular-nums text-ink"
              >
                {book.rate.toFixed(4)}
              </Text>
              {time && (
                <View className="flex-row items-center gap-x-[5px]">
                  <View className="size-[5px] rounded-full bg-lime-dark" />
                  <Text className="font-sans text-[11px] text-muted">
                    {time}
                  </Text>
                </View>
              )}
            </View>
            {add}
          </View>
        </View>
      )}

      {tab === 'positions' && (
        <PositionsTab
          book={book}
          charted={charted}
          onSell={setSelling}
          mobile={mobile}
        />
      )}
      {tab === 'watchlist' && (
        <WatchlistTab book={book} charted={charted} mobile={mobile} />
      )}
      {tab === 'portfolio' && (
        <PortfolioTab book={book} mobile={mobile} animate={animate} />
      )}

      {selling && (
        <SellSheet
          holding={selling}
          rate={book.rate}
          onClose={sold => {
            if (sold && !expanded.includes(selling.symbol)) {
              setUi({ expandedSymbols: [...expanded, selling.symbol] });
            }
            setSelling(null);
          }}
        />
      )}
      {adding && (
        <AddPositionSheet
          book={book}
          onClose={() => setAdding(false)}
          onAdded={s => {
            setAdding(false);
            setUi({
              tradingTab: 'positions',
              expandedSymbols: expanded.includes(s)
                ? expanded
                : [...expanded, s],
            });
          }}
        />
      )}
    </Card>
  );
}

const plus = (color: string) => (
  <PlusIcon size={10} color={color} strokeWidth={1.4} />
);
