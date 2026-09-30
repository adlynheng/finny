import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { PlusIcon } from '@/components/icons/PlusIcon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AddButton, EmptyNote, GhostRows } from '@/components/ui/Empty';
import { Segmented } from '@/components/ui/Segmented';
import { cx } from '@/components/ui/cardChrome';
import { now } from '@/lib/today';
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

/**
 * The rate updates hourly and is refetched about as often; one older than
 * this has missed several refreshes.
 */
const FX_STALE_MS = 3 * 60 * 60_000;

const count = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * The glass panel under the hero: Positions, Watchlist and Portfolio tabs, a
 * line about the open tab, the USD/SGD rate and when it was fetched, and Add
 * position. The Sell and Add position forms open from here. The rate's time
 * is the honest signal of its age: marked stale once old, and the fallback
 * named as such before any fetch. A failed quote request shows a quiet notice
 * with a retry beside it.
 *
 * A tab with nothing to list is the design's empty tab: dashed rows, and
 * beside them what fills it (and, for Positions, a first one to add).
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
  const adding = useUiStore(s => s.addPositionOpen);
  const setAdding = (open: boolean) => setUi({ addPositionOpen: open });
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
  const tabEmpty =
    tab === 'watchlist'
      ? book.watched.length === 0
      : book.holdings.length === 0;
  const full = {
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
  const line = tabEmpty ? full.split(' · ')[0] : full;

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
  const stale =
    !book.rateAt || now().getTime() - book.rateAt.getTime() > FX_STALE_MS;
  const rateAge = (
    <View className="flex-row items-center gap-x-[5px]">
      <View
        testID="trading-rate-dot"
        className={cx(
          'size-[5px] rounded-full',
          stale ? 'bg-danger' : 'bg-lime-dark',
        )}
      />
      <Text
        testID="trading-rate-time"
        className="font-sans text-[11px] text-muted"
      >
        {book.rateAt
          ? `${formatTime(book.rateAt)}${stale ? ' · stale' : ''}`
          : 'fallback rate'}
      </Text>
    </View>
  );
  const notice = book.quoteError && (
    <View testID="quote-error" className="flex-row items-center gap-x-[6px]">
      <Text className="font-sans text-[11px] text-muted">
        {book.prices === 'priced'
          ? 'Prices not refreshed'
          : 'Prices unavailable'}
      </Text>
      <Pressable
        testID="quote-retry"
        accessibilityRole="button"
        accessibilityLabel="Retry prices"
        hitSlop={8}
        onPress={book.retryQuotes}
      >
        <Text className="font-sans text-[11px] text-ink underline">Retry</Text>
      </Pressable>
    </View>
  );
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
                {rateAge}
              </View>
              {notice}
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
            {notice}
            <View className="h-[28px] flex-row items-center gap-x-[8px] rounded-6 bg-ink/[.04] px-[10px]">
              <Text className="font-sans text-[12px] text-muted">USD/SGD</Text>
              <Text
                testID="trading-rate"
                className="font-sans text-[12px] tabular-nums text-ink"
              >
                {book.rate.toFixed(4)}
              </Text>
              {rateAge}
            </View>
            {add}
          </View>
        </View>
      )}

      {tabEmpty && <EmptyTab tab={tab} onAdd={() => setAdding(true)} />}
      {!tabEmpty && tab === 'positions' && (
        <PositionsTab
          book={book}
          charted={charted}
          onSell={setSelling}
          mobile={mobile}
        />
      )}
      {!tabEmpty && tab === 'watchlist' && (
        <WatchlistTab book={book} charted={charted} mobile={mobile} />
      )}
      {!tabEmpty && tab === 'portfolio' && (
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
            setUi({
              addPositionOpen: false,
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

/** Each tab's empty note, from the design. */
const EMPTY_COPY: Record<TradingTab, { title: string; body: string }> = {
  positions: {
    title: 'No positions yet',
    body: 'Add a holding and its buy lots. Finny tracks cost basis, P&L and FX, with US$ prices shown in S$ too.',
  },
  watchlist: {
    title: 'Nothing on your watchlist',
    body: "Follow tickers you don't own yet to see their price and 30-day trend.",
  },
  portfolio: {
    title: 'No mix to show yet',
    body: 'Your split by instrument and industry fills in from your positions.',
  },
};

function EmptyTab({ tab, onAdd }: { tab: TradingTab; onAdd: () => void }) {
  const { title, body } = EMPTY_COPY[tab];
  return (
    <View
      testID="trading-empty"
      className="mt-[14px] min-h-0 flex-1 flex-row gap-x-[40px] ios:mt-[12px] ios:flex-col ios:gap-y-[14px]"
    >
      <View className="min-w-0 flex-1 ios:flex-none">
        <GhostRows count={3} tone="glass" />
      </View>
      <EmptyNote
        tone="glass"
        className="w-[360px] justify-end self-stretch pb-[4px] ios:w-auto ios:pb-0"
        title={title}
        body={body}
        action={
          tab === 'positions' && (
            <AddButton
              testID="add-first-position"
              label="Add your first position"
              onPress={onAdd}
            />
          )
        }
      />
    </View>
  );
}

const plus = (color: string) => (
  <PlusIcon size={10} color={color} strokeWidth={1.4} />
);
