import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Empty';
import {
  Chevron,
  ExpandableRow,
  NumericCell,
  SubRow,
  TableHeader,
  TotalsRow,
} from '@/components/ui/Table';
import { cx } from '@/components/ui/cardChrome';
import { positionsColumns } from '@/components/ui/tableColumns';
import { useUiStore } from '@/stores/uiStore';
import { tokens } from '@/theme/tokens';
import type { SaleRow } from '@/types/domain';
import type { Holding } from '@/utils/derive/portfolio';
import { formatFullDate } from '@/utils/format/date';
import { formatDualMoney, formatSignedPercent } from '@/utils/format/money';
import type { Book } from './useTradingBook';

const LABELS = [
  '',
  'Holding',
  'Qty',
  'Avg cost',
  'Total cost',
  'Price',
  'Market value',
  'Unrealised P&L',
  'Action',
];

/** `12,000`, or up to four places for a fractional share. */
const qty = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 4 });

/** `Bought 12 Mar 2024` and `Sold 14 Jul 2026`: the full date without its weekday. */
const onDate = (verb: string, date: string) =>
  `${verb} ${formatFullDate(date).split(', ')[1]}`;

/** One line under a holding: a lot still held, or a sale that realised P&L. */
type SubLine = {
  key: string;
  label: string;
  tag: string;
  sale: boolean;
  quantity: string;
  cost: { primary: string; secondary: string | null };
  /** The lot's cost, or the sale's snapshotted cost basis, in S$. */
  total: { primary: string; secondary: string | null };
  priceNote: string;
  value: { primary: string; secondary: string | null };
  pnl: { primary: string; secondary: string | null };
  note: string;
  noteTone: ReturnType<typeof pctTone>;
  loss: boolean;
  /** A lot has no value or P&L until its holding has a price. */
  priced: boolean;
};

/**
 * Lots oldest first, each valued at today's price, then the instrument's
 * recorded sales at their sale price and realised P&L.
 */
function subLines(h: Holding, sales: readonly SaleRow[], rate: number) {
  const dual = (cents: number, signed = false) =>
    formatDualMoney(cents, rate, { currency: 'SGD', signed });
  const price = (cents: number) =>
    formatDualMoney(cents, rate, { currency: h.currency, decimals: 2 });
  const lots: SubLine[] = h.lots.map((l, k) => {
    const value = Math.round(
      l.quantity * (h.priceCents ?? l.cost_per_unit_cents) * h.fx,
    );
    const priced = h.priceCents !== null;
    const cost = Math.round(l.quantity * l.cost_per_unit_cents * h.fx);
    return {
      key: `lot-${l.id}`,
      label: onDate('Bought', l.purchased_at),
      tag: `Lot ${k + 1}`,
      sale: false,
      quantity: qty(l.quantity),
      cost: price(l.cost_per_unit_cents),
      total: dual(cost),
      priceNote: '',
      value: dual(value),
      pnl: dual(value - cost, true),
      note: formatSignedPercent(((value - cost) / cost) * 100),
      noteTone: pctTone(value - cost),
      loss: value < cost,
      priced,
    };
  });
  const sold: SubLine[] = sales
    .filter(s => s.instrument_id === h.instrument.id)
    .map(s => ({
      key: `sale-${s.id}`,
      label: onDate('Sold', s.sold_at),
      tag: 'Realised',
      sale: true,
      quantity: `−${qty(s.quantity)}`,
      cost: price(s.price_per_unit_cents),
      total: dual(Math.round(s.cost_basis_cents * h.fx)),
      priceNote: 'sale price',
      value: dual(Math.round(s.proceeds_cents * h.fx)),
      pnl: dual(Math.round(s.realized_pnl_cents * h.fx), true),
      note: 'realised',
      noteTone: 'muted' as const,
      loss: s.realized_pnl_cents < 0,
      priced: true,
    }));
  return [...lots, ...sold];
}

/** A holding's headline figures, in both currencies. */
function figures(h: Holding, rate: number) {
  const price = (cents: number) =>
    formatDualMoney(cents, rate, { currency: h.currency, decimals: 2 });
  return {
    cost: price(h.avgCostCents),
    total: formatDualMoney(h.costCents, rate, { currency: 'SGD' }),
    price: h.priceCents === null ? null : price(h.priceCents),
    value: formatDualMoney(h.valueCents, rate, { currency: 'SGD' }),
    pnl: formatDualMoney(h.pnlCents, rate, { currency: 'SGD', signed: true }),
    note: formatSignedPercent(h.pnlPercent),
    noteTone: pctTone(h.pnlCents),
    lots: `${h.lots.length} ${h.lots.length === 1 ? 'lot' : 'lots'}`,
  };
}

const orNull = (s: string | null) => s ?? undefined;

/** A P&L percentage's colour, by its P&L's sign: green up, red down, muted flat. */
const pctText = {
  gain: 'text-gain',
  danger: 'text-danger',
  muted: 'text-muted',
} as const;
const pctTone = (pnl: number): keyof typeof pctText =>
  pnl > 0 ? 'gain' : pnl < 0 ? 'danger' : 'muted';

/**
 * A figure that needs a price it does not have: a skeleton while prices load,
 * else a dash. Never the cost-basis stand-in, which would read as a P&L of 0.
 */
function Unpriced({
  loading,
  size = 'row',
}: {
  loading: boolean;
  size?: 'row' | 'sub' | 'card';
}) {
  return (
    <View className="items-end">
      {loading ? (
        <Skeleton
          className={cx(
            size === 'sub' ? 'h-[8px] w-[52px]' : 'h-[10px] w-[64px]',
            'my-[3px]',
          )}
        />
      ) : (
        <Text
          className={cx(
            'font-sans tabular-nums text-muted',
            size === 'row' ? 'text-[13px]' : 'text-[12px]',
            size === 'card' && 'text-[14px]',
          )}
        >
          —
        </Text>
      )}
    </View>
  );
}

type Props = {
  book: Book;
  /** The holding the chart shows, in Position mode. */
  charted: string | null;
  onSell: (h: Holding) => void;
  mobile: boolean;
};

/**
 * Every holding with its quantity, average cost, price, market value and
 * unrealised P&L; without a price (still loading, or none to be had) the
 * last three are a skeleton or a dash while the cost columns stay. A row opens onto its lots and recorded sales; its chart
 * button switches the hero to that holding. Desktop lays it out as the
 * eight-column table; mobile as expanding cards.
 */
export function PositionsTab(props: Props) {
  return props.mobile ? (
    <PositionCards {...props} />
  ) : (
    <PositionsTable {...props} />
  );
}

function PositionsTable({ book, charted, onSell }: Props) {
  const expanded = useUiStore(s => s.expandedSymbols);
  const toggle = useUiStore(s => s.toggleExpanded);
  const chart = useUiStore(s => s.selectTradingSymbol);
  const { rate, totals } = book;
  const loading = book.prices === 'loading';
  const priced = book.prices === 'priced';

  return (
    <View className="min-h-0 flex-1">
      <TableHeader columns={positionsColumns} labels={LABELS} />
      <ScrollView
        className="min-h-0 flex-1"
        showsVerticalScrollIndicator={false}
      >
        {book.holdings.map(h => {
          const f = figures(h, rate);
          return (
            <ExpandableRow
              key={h.symbol}
              testID={`position-${h.symbol}`}
              columns={positionsColumns}
              open={expanded.includes(h.symbol)}
              onToggle={() => toggle(h.symbol)}
              selected={charted === h.symbol}
              accessibilityLabel={`${h.symbol}, ${f.lots}`}
              subRows={subLines(h, book.sales, rate).map(l => (
                <SubRow
                  key={l.key}
                  testID={`position-${h.symbol}-${l.key}`}
                  columns={positionsColumns}
                >
                  <View className="flex-row items-center gap-x-[8px]">
                    <SubDot sale={l.sale} />
                    <Text
                      numberOfLines={1}
                      className="font-sans text-[12px] text-ink"
                    >
                      {l.label}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="font-sans text-[10px] uppercase tracking-[0.04em] text-muted"
                    >
                      {l.tag}
                    </Text>
                  </View>
                  <Text className="font-sans text-[12px] tabular-nums text-ink">
                    {l.quantity}
                  </Text>
                  <NumericCell
                    size="sub"
                    primary={l.cost.primary}
                    secondary={orNull(l.cost.secondary)}
                  />
                  <NumericCell
                    size="sub"
                    primary={l.total.primary}
                    secondary={orNull(l.total.secondary)}
                  />
                  <Text
                    numberOfLines={1}
                    className="font-sans text-[11px] text-muted"
                  >
                    {l.priceNote}
                  </Text>
                  {l.priced ? (
                    <NumericCell
                      size="sub"
                      primary={l.value.primary}
                      secondary={orNull(l.value.secondary)}
                    />
                  ) : (
                    <Unpriced loading={loading} size="sub" />
                  )}
                  {l.priced ? (
                    <NumericCell
                      size="sub"
                      primary={l.pnl.primary}
                      secondary={orNull(l.pnl.secondary)}
                      note={l.note}
                      noteTone={l.noteTone}
                      tone={l.loss ? 'danger' : 'ink'}
                    />
                  ) : (
                    <Unpriced loading={loading} size="sub" />
                  )}
                  <View />
                </SubRow>
              ))}
            >
              <View className="gap-y-[1px]">
                <View className="flex-row items-baseline gap-x-[8px]">
                  <Text className="font-sans text-[13px] text-ink">
                    {h.symbol}
                  </Text>
                  <Text className="font-sans text-[10px] uppercase tracking-[0.04em] text-muted">
                    {h.instrument.kind}
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  className="font-sans text-[11px] text-muted"
                >
                  {h.instrument.name} · {f.lots}
                </Text>
              </View>
              <Text className="font-sans text-[13px] tabular-nums text-ink">
                {qty(h.quantity)}
              </Text>
              <NumericCell
                primary={f.cost.primary}
                secondary={orNull(f.cost.secondary)}
              />
              <NumericCell
                primary={f.total.primary}
                secondary={orNull(f.total.secondary)}
              />
              {f.price ? (
                <NumericCell
                  primary={f.price.primary}
                  secondary={orNull(f.price.secondary)}
                />
              ) : (
                <Unpriced loading={loading} />
              )}
              {f.price ? (
                <NumericCell
                  primary={f.value.primary}
                  secondary={orNull(f.value.secondary)}
                />
              ) : (
                <Unpriced loading={loading} />
              )}
              {f.price ? (
                <NumericCell
                  primary={f.pnl.primary}
                  secondary={orNull(f.pnl.secondary)}
                  note={f.note}
                  noteTone={f.noteTone}
                  tone={h.pnlCents < 0 ? 'danger' : 'ink'}
                  lead={h.pnlCents >= 0 ? <UpDot /> : undefined}
                />
              ) : (
                <Unpriced loading={loading} />
              )}
              <View className="flex-row items-center gap-x-[6px]">
                <Pressable
                  testID={`position-${h.symbol}-chart`}
                  accessibilityRole="button"
                  accessibilityLabel={`Chart ${h.symbol}`}
                  onPress={() => chart(h.symbol)}
                  className="size-[28px] items-center justify-center rounded-6 border border-ink/10 hover:border-ink/25 hover:bg-white"
                >
                  <ChartIcon />
                </Pressable>
                <Button
                  testID={`position-${h.symbol}-sell`}
                  variant="outline"
                  size="sm"
                  label="Sell"
                  onPress={() => onSell(h)}
                />
              </View>
            </ExpandableRow>
          );
        })}
      </ScrollView>
      <TotalsRow testID="positions-totals" columns={positionsColumns}>
        <View />
        <Text className="font-sans text-[13px] text-ink">Total</Text>
        <View />
        <View />
        <TotalCell
          {...formatDualMoney(totals.costCents, book.rate, { currency: 'SGD' })}
        />
        <View />
        {priced ? (
          <TotalCell
            {...formatDualMoney(totals.valueCents, book.rate, {
              currency: 'SGD',
            })}
          />
        ) : (
          <Unpriced loading={loading} />
        )}
        {priced ? (
          <TotalCell
            {...formatDualMoney(totals.pnlCents, book.rate, {
              currency: 'SGD',
              signed: true,
            })}
            note={formatSignedPercent(totals.pnlPercent)}
            noteTone={pctTone(totals.pnlCents)}
          />
        ) : (
          <Unpriced loading={loading} />
        )}
        <View />
      </TotalsRow>
    </View>
  );
}

/** The totals row's figures: 13px, over an 11px muted S$ line. */
function TotalCell({
  primary,
  secondary,
  note,
  noteTone = 'muted',
}: {
  primary: string;
  secondary: string | null;
  note?: string;
  noteTone?: ReturnType<typeof pctTone>;
}) {
  return (
    <View className="items-end gap-y-[1px]">
      <View className="flex-row items-center gap-x-[6px]">
        <Text
          numberOfLines={1}
          className="font-sans text-[13px] tabular-nums text-ink"
        >
          {primary}
        </Text>
        {note && (
          <Text className={cx('font-sans text-[11px]', pctText[noteTone])}>
            {note}
          </Text>
        )}
      </View>
      <Text numberOfLines={1} className="font-sans text-[11px] text-muted">
        {secondary}
      </Text>
    </View>
  );
}

function PositionCards({ book, charted, onSell }: Props) {
  const expanded = useUiStore(s => s.expandedSymbols);
  const toggle = useUiStore(s => s.toggleExpanded);
  const chart = useUiStore(s => s.selectTradingSymbol);
  const { rate, totals } = book;
  const loading = book.prices === 'loading';
  const priced = book.prices === 'priced';
  const total = {
    cost: formatDualMoney(totals.costCents, rate, { currency: 'SGD' }),
    value: formatDualMoney(totals.valueCents, rate, { currency: 'SGD' }),
    pnl: formatDualMoney(totals.pnlCents, rate, {
      currency: 'SGD',
      signed: true,
    }),
  };

  return (
    <View className="mt-[10px]">
      {book.holdings.map(h => {
        const f = figures(h, rate);
        const open = expanded.includes(h.symbol);
        return (
          <View
            key={h.symbol}
            testID={`position-${h.symbol}`}
            className="border-t border-row-border"
          >
            <Pressable
              testID={`position-${h.symbol}-toggle`}
              accessibilityRole="button"
              accessibilityLabel={`${h.symbol}, ${f.lots}`}
              accessibilityState={{ expanded: open }}
              onPress={() => toggle(h.symbol)}
              className={cx(
                'min-h-[56px] flex-row items-center gap-x-[10px] px-[4px]',
                charted === h.symbol && 'bg-row-selected',
              )}
            >
              <Chevron open={open} />
              <View className="min-w-0 flex-1 gap-y-[2px]">
                <View className="flex-row items-baseline gap-x-[8px]">
                  <Text className="font-sans text-[14px] text-ink">
                    {h.symbol}
                  </Text>
                  <Text className="font-sans text-[10px] uppercase tracking-[0.04em] text-muted">
                    {h.instrument.kind}
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  className="font-sans text-[11px] text-muted"
                >
                  {h.instrument.name} · {f.lots}
                </Text>
              </View>
              {f.price ? (
                <View className="items-end gap-y-[2px]">
                  <Text className="font-sans text-[14px] tabular-nums text-ink">
                    {f.value.primary}
                  </Text>
                  <View className="flex-row items-center gap-x-[5px]">
                    {h.pnlCents >= 0 && <UpDot />}
                    <Text
                      className={cx(
                        'font-sans text-[12px] tabular-nums',
                        h.pnlCents < 0 ? 'text-danger' : 'text-ink',
                      )}
                    >
                      {f.pnl.primary}
                    </Text>
                    <Text
                      className={cx(
                        'font-sans text-[11px]',
                        pctText[f.noteTone],
                      )}
                    >
                      {f.note}
                    </Text>
                  </View>
                </View>
              ) : (
                <Unpriced loading={loading} size="card" />
              )}
            </Pressable>
            {open && (
              <View
                testID={`position-${h.symbol}-details`}
                className="gap-y-[12px] bg-sub-area pb-[14px] pl-[36px] pr-[4px] pt-[6px]"
              >
                <View className="flex-row gap-x-[10px]">
                  <Figure label="Qty" primary={qty(h.quantity)} />
                  <Figure label="Avg cost" {...f.cost} />
                  <Figure
                    label="Price"
                    primary={f.price?.primary ?? (loading ? '…' : '—')}
                    secondary={f.price?.secondary ?? null}
                  />
                </View>
                <View>
                  {subLines(h, book.sales, rate).map(l => (
                    <View
                      key={l.key}
                      testID={`position-${h.symbol}-${l.key}`}
                      className="min-h-[40px] flex-row items-center gap-x-[8px] border-t border-row-border"
                    >
                      <SubDot sale={l.sale} />
                      <View className="min-w-0 flex-1 gap-y-[1px]">
                        <View className="flex-row items-baseline gap-x-[6px]">
                          <Text className="font-sans text-[12px] text-ink">
                            {l.label}
                          </Text>
                          <Text className="font-sans text-[10px] uppercase tracking-[0.04em] text-muted">
                            {l.tag}
                          </Text>
                        </View>
                        <Text className="font-sans text-[10px] text-muted">
                          {l.quantity} @ {l.cost.primary}
                        </Text>
                      </View>
                      {l.priced ? (
                        <View className="items-end gap-y-[1px]">
                          <Text className="font-sans text-[12px] tabular-nums text-ink">
                            {l.value.primary}
                          </Text>
                          <View className="flex-row gap-x-[5px]">
                            <Text
                              className={cx(
                                'font-sans text-[11px] tabular-nums',
                                l.loss ? 'text-danger' : 'text-ink',
                              )}
                            >
                              {l.pnl.primary}
                            </Text>
                            <Text
                              className={cx(
                                'font-sans text-[10px]',
                                pctText[l.noteTone],
                              )}
                            >
                              {l.note}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <Unpriced loading={loading} size="sub" />
                      )}
                    </View>
                  ))}
                </View>
                <View className="flex-row gap-x-[8px]">
                  <Pressable
                    testID={`position-${h.symbol}-chart`}
                    accessibilityRole="button"
                    accessibilityLabel={`Chart ${h.symbol}`}
                    onPress={() => chart(h.symbol)}
                    className="h-[42px] flex-1 flex-row items-center justify-center gap-x-[8px] rounded-10 border border-ink/[.14]"
                  >
                    <ChartIcon />
                    <Text className="font-sans text-[13px] text-ink">
                      Chart
                    </Text>
                  </Pressable>
                  <Pressable
                    testID={`position-${h.symbol}-sell`}
                    accessibilityRole="button"
                    accessibilityLabel="Sell"
                    onPress={() => onSell(h)}
                    className="h-[42px] flex-1 items-center justify-center rounded-10 bg-ink"
                  >
                    <Text className="font-sans text-[13px] text-white">
                      Sell
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        );
      })}
      <View
        testID="positions-totals"
        className="flex-row items-center gap-x-[10px] border-t border-totals-border pb-[2px] pl-[36px] pr-[4px] pt-[12px]"
      >
        <View className="flex-1 gap-y-[1px]">
          <Text className="font-sans text-[14px] text-ink">Total</Text>
          <Text numberOfLines={1} className="font-sans text-[11px] text-muted">
            Cost {total.cost.primary}
          </Text>
        </View>
        {priced ? (
          <View className="items-end gap-y-[2px]">
            <Text className="font-sans text-[14px] tabular-nums text-ink">
              {total.value.primary}
            </Text>
            <View className="flex-row gap-x-[5px]">
              <Text className="font-sans text-[12px] tabular-nums text-ink">
                {total.pnl.primary}
              </Text>
              <Text
                className={cx(
                  'font-sans text-[11px]',
                  pctText[pctTone(totals.pnlCents)],
                )}
              >
                {formatSignedPercent(totals.pnlPercent)}
              </Text>
            </View>
            <Text className="font-sans text-[11px] text-muted">
              {total.value.secondary}
            </Text>
          </View>
        ) : (
          <Unpriced loading={loading} size="card" />
        )}
      </View>
    </View>
  );
}

/** A mobile figure: a muted label over the value, and its S$ line when it has one. */
function Figure({
  label,
  primary,
  secondary = null,
}: {
  label: string;
  primary: string;
  secondary?: string | null;
}) {
  return (
    <View className="min-w-0 flex-1 gap-y-[3px]">
      <Text className="font-sans text-[11px] text-muted">{label}</Text>
      <View className="gap-y-[1px]">
        <Text
          numberOfLines={1}
          className="font-sans text-[13px] tabular-nums text-ink"
        >
          {primary}
        </Text>
        {secondary !== null && (
          <Text
            numberOfLines={1}
            className="font-sans text-[11px] tabular-nums text-muted"
          >
            {secondary}
          </Text>
        )}
      </View>
    </View>
  );
}

/** The lime dot beside a gain. */
function UpDot() {
  return (
    <View testID="pnl-up" className="size-[6px] rounded-full bg-lime-dark" />
  );
}

/** A sub-line's mark: white for a lot, lime for a sale. */
function SubDot({ sale }: { sale: boolean }) {
  return (
    <View
      className={cx(
        'size-[6px] rounded-full border border-ink',
        sale ? 'bg-lime' : 'bg-white',
      )}
    />
  );
}

function ChartIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 16 16">
      <Path
        d="M2.5 12.5l3.5-4 3 2.5 4.5-6"
        stroke={tokens.colors.ink}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
