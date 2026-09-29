import { Pressable, ScrollView, Text, View } from 'react-native';

import { Sparkline } from '@/components/charts/Sparkline';
import { NumericCell, TableHeader, TableRow } from '@/components/ui/Table';
import { cx } from '@/components/ui/cardChrome';
import { watchlistColumns } from '@/components/ui/tableColumns';
import { useBars } from '@/hooks/useBars';
import { useUiStore } from '@/stores/uiStore';
import type { InstrumentRow } from '@/types/domain';
import { currencyOf } from '@/utils/derive/portfolio';
import { formatDualMoney, formatSignedPercent } from '@/utils/format/money';
import type { Book } from './useTradingBook';

const LABELS = [
  'Symbol',
  '30-day trend',
  'Price',
  'Day change',
  'In portfolio',
];

type Row = {
  instrument: InstrumentRow;
  held: boolean;
  closes: number[];
  price: { primary: string; secondary: string | null } | null;
  dayChange: number | null;
};

/**
 * Every held and watched symbol: its 30-day trend, price and day change, and
 * whether it is held. A held row charts its symbol in the hero; the others do
 * nothing when pressed.
 */
export function WatchlistTab({
  book,
  charted,
  mobile,
}: {
  book: Book;
  /** The holding the chart shows, in Position mode. */
  charted: string | null;
  mobile: boolean;
}) {
  const chart = useUiStore(s => s.selectTradingSymbol);
  const { bars } = useBars(
    book.watched.map(i => i.symbol),
    '1M',
  );
  const held = new Set(book.holdings.map(h => h.symbol));
  const rows: Row[] = book.watched.map(instrument => {
    const quote = book.quotes[instrument.symbol];
    return {
      instrument,
      held: held.has(instrument.symbol),
      closes: (bars[instrument.symbol] ?? []).map(b => b.closeCents),
      price: quote
        ? formatDualMoney(quote.priceCents, book.rate, {
            currency: currencyOf(instrument),
            decimals: 2,
          })
        : null,
      dayChange: quote?.dayChangePercent ?? null,
    };
  });
  const press = (r: Row) =>
    r.held ? () => chart(r.instrument.symbol) : undefined;

  if (mobile) {
    return (
      <View className="mt-[10px]">
        {rows.map(r => (
          <Pressable
            key={r.instrument.id}
            testID={`watch-${r.instrument.symbol}`}
            accessibilityRole={r.held ? 'button' : undefined}
            disabled={!r.held}
            onPress={press(r)}
            className={cx(
              'min-h-[54px] flex-row items-center gap-x-[12px] border-t border-row-border px-[4px]',
              charted === r.instrument.symbol && 'bg-row-selected',
            )}
          >
            <View className="min-w-0 flex-1 gap-y-[1px]">
              <View className="flex-row items-center gap-x-[6px]">
                <Text className="font-sans text-[14px] text-ink">
                  {r.instrument.symbol}
                </Text>
                {r.held && <Held small />}
              </View>
              <Text
                numberOfLines={1}
                className="font-sans text-[11px] text-muted"
              >
                {r.instrument.name}
              </Text>
            </View>
            <Sparkline
              testID={`watch-${r.instrument.symbol}-spark`}
              values={r.closes}
              dayChange={r.dayChange ?? 0}
              compact
            />
            <View className="items-end gap-y-[1px]">
              <Text className="font-sans text-[14px] tabular-nums text-ink">
                {r.price?.primary ?? '—'}
              </Text>
              <DayChange value={r.dayChange} className="text-[11px]" />
            </View>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View className="min-h-0 flex-1">
      <TableHeader columns={watchlistColumns} labels={LABELS} />
      <ScrollView
        className="min-h-0 flex-1"
        showsVerticalScrollIndicator={false}
      >
        {rows.map(r => (
          <TableRow
            key={r.instrument.id}
            testID={`watch-${r.instrument.symbol}`}
            columns={watchlistColumns}
            onPress={press(r)}
            selected={charted === r.instrument.symbol}
            accessibilityLabel={
              r.held ? `Chart ${r.instrument.symbol}` : undefined
            }
          >
            <View className="gap-y-[1px]">
              <Text className="font-sans text-[13px] text-ink">
                {r.instrument.symbol}
              </Text>
              <Text
                numberOfLines={1}
                className="font-sans text-[11px] text-muted"
              >
                {r.instrument.name}
              </Text>
            </View>
            <Sparkline
              testID={`watch-${r.instrument.symbol}-spark`}
              values={r.closes}
              dayChange={r.dayChange ?? 0}
            />
            <NumericCell
              primary={r.price?.primary ?? '—'}
              secondary={r.price?.secondary ?? undefined}
            />
            <DayChange value={r.dayChange} className="text-[13px]" />
            {r.held ? <Held /> : <View />}
          </TableRow>
        ))}
      </ScrollView>
    </View>
  );
}

function DayChange({
  value,
  className,
}: {
  value: number | null;
  className: string;
}) {
  return (
    <Text
      numberOfLines={1}
      className={cx(
        'font-sans tabular-nums',
        className,
        value !== null && value < 0 ? 'text-danger' : 'text-ink',
      )}
    >
      {value === null ? '—' : formatSignedPercent(value, 2)}
    </Text>
  );
}

/** "In portfolio · Held": an ink dot and the word. */
function Held({ small = false }: { small?: boolean }) {
  return (
    <View
      testID="watch-held"
      className={cx(
        'flex-row items-center',
        small ? 'gap-x-[4px]' : 'gap-x-[6px]',
      )}
    >
      <View
        className={cx(
          'rounded-full bg-ink',
          small ? 'size-[5px]' : 'size-[6px]',
        )}
      />
      <Text
        className={cx(
          'font-sans text-muted',
          small ? 'text-[10px]' : 'text-[11px]',
        )}
      >
        Held
      </Text>
    </View>
  );
}
