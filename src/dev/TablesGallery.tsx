/**
 * Temporary: Task 35's table primitives with sample Positions and Watchlist
 * rows, so alignment, the expand animation and the hover wash can be checked
 * by eye. Mounted from SurfacesGallery until the pages exist (Phase H); delete
 * it then.
 */

import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  ExpandableRow,
  NumericCell,
  SubRow,
  TableHeader,
  TableRow,
  TotalsRow,
} from '@/components/ui/Table';
import {
  positionsColumns,
  watchlistColumns,
} from '@/components/ui/tableColumns';
import { tokens } from '@/theme/tokens';

type Lot = {
  label: string;
  tag: string;
  qty: string;
  cost: [string, string];
  note: string;
  mv: [string, string];
  pl: [string, string];
  plp: string;
  loss?: boolean;
  sold?: boolean;
};

type Holding = {
  sym: string;
  type: string;
  name: string;
  qty: string;
  cost: [string, string];
  price: [string, string];
  mv: [string, string];
  pl: [string, string];
  plp: string;
  loss?: boolean;
  lots: Lot[];
};

const holdings: Holding[] = [
  {
    sym: 'VWRA',
    type: 'ETF',
    name: 'Vanguard FTSE All-World',
    qty: '120',
    cost: ['US$118.40', '(S$159.98)'],
    price: ['US$131.25', '(S$177.35)'],
    mv: ['US$15,750.00', '(S$21,281.40)'],
    pl: ['+US$1,542.00', '(+S$2,083.55)'],
    plp: '+10.9%',
    lots: [
      {
        label: 'Bought 12 Mar 2025',
        tag: 'Lot 1',
        qty: '80',
        cost: ['US$112.10', '(S$151.47)'],
        note: '',
        mv: ['US$10,500.00', '(S$14,187.60)'],
        pl: ['+US$1,532.00', '(+S$2,070.04)'],
        plp: '+17.1%',
      },
      {
        label: 'Bought 4 Aug 2026',
        tag: 'Lot 2',
        qty: '40',
        cost: ['US$131.00', '(S$177.01)'],
        note: '',
        mv: ['US$5,250.00', '(S$7,093.80)'],
        pl: ['+US$10.00', '(+S$13.51)'],
        plp: '+0.2%',
      },
      {
        label: 'Sold 2 Sep 2026',
        tag: 'Realised',
        qty: '−10',
        cost: ['US$130.80', '(S$176.74)'],
        note: 'sale price',
        mv: ['US$1,308.00', '(S$1,767.37)'],
        pl: ['+US$187.00', '(+S$252.67)'],
        plp: 'realised',
        sold: true,
      },
    ],
  },
  {
    sym: 'TSLA',
    type: 'Stock',
    name: 'Tesla, Inc.',
    qty: '15',
    cost: ['US$262.00', '(S$354.01)'],
    price: ['US$241.30', '(S$326.05)'],
    mv: ['US$3,619.50', '(S$4,890.67)'],
    pl: ['−US$310.50', '(−S$419.55)'],
    plp: '−7.9%',
    loss: true,
    lots: [
      {
        label: 'Bought 20 Jan 2026',
        tag: 'Lot 1',
        qty: '15',
        cost: ['US$262.00', '(S$354.01)'],
        note: '',
        mv: ['US$3,619.50', '(S$4,890.67)'],
        pl: ['−US$310.50', '(−S$419.55)'],
        plp: '−7.9%',
        loss: true,
      },
    ],
  },
  {
    sym: 'D05',
    type: 'Stock',
    name: 'DBS Group Holdings',
    qty: '300',
    cost: ['S$36.20', ''],
    price: ['S$42.85', ''],
    mv: ['S$12,855.00', ''],
    pl: ['+S$1,995.00', ''],
    plp: '+18.4%',
    lots: [],
  },
];

const watch = [
  {
    sym: 'VWRA',
    name: 'Vanguard FTSE All-World',
    price: ['US$131.25', '(S$177.35)'],
    chg: '+0.42%',
    held: true,
  },
  {
    sym: 'NVDA',
    name: 'NVIDIA Corporation',
    price: ['US$168.20', '(S$227.27)'],
    chg: '−1.18%',
    held: false,
  },
  {
    sym: 'D05',
    name: 'DBS Group Holdings',
    price: ['S$42.85', ''],
    chg: '+0.21%',
    held: true,
  },
] as const;

const spark = 'M0,14L6,12L12,15L18,9L24,11L30,6L36,8L42,4L48,5';

/** Lots still held, not sales; a holding with no listed lots is one lot. */
const lotLabel = (h: Holding) => {
  const n = h.lots.filter(l => !l.sold).length || 1;
  return `${n} ${n === 1 ? 'lot' : 'lots'}`;
};

const LimeDot = () => <View className="size-[6px] rounded-full bg-lime-dark" />;

function Holding({
  h,
  open,
  selected,
  onToggle,
}: {
  h: Holding;
  open: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const plTone = h.loss ? 'danger' : 'ink';
  return (
    <ExpandableRow
      accessibilityLabel={h.sym}
      columns={positionsColumns}
      open={open}
      selected={selected}
      onToggle={onToggle}
      subRows={h.lots.map(l => (
        <SubRow key={l.label} columns={positionsColumns}>
          <View className="flex-row items-center gap-[8px]">
            <View
              className={`size-[6px] rounded-full border border-ink ${
                l.sold ? 'bg-lime' : 'bg-white'
              }`}
            />
            <Text numberOfLines={1} className="font-sans text-[12px] text-ink">
              {l.label}
            </Text>
            <Text className="font-sans text-[10px] uppercase tracking-[0.04em] text-muted">
              {l.tag}
            </Text>
          </View>
          <Text className="font-sans text-[12px] tabular-nums text-ink">
            {l.qty}
          </Text>
          <NumericCell size="sub" primary={l.cost[0]} secondary={l.cost[1]} />
          <Text className="font-sans text-[11px] text-muted">{l.note}</Text>
          <NumericCell size="sub" primary={l.mv[0]} secondary={l.mv[1]} />
          <NumericCell
            size="sub"
            tone={l.loss ? 'danger' : 'ink'}
            primary={l.pl[0]}
            note={l.plp}
            secondary={l.pl[1]}
          />
          <View />
        </SubRow>
      ))}
    >
      <View className="gap-[1px]">
        <View className="flex-row items-baseline gap-[8px]">
          <Text className="font-sans text-[13px] text-ink">{h.sym}</Text>
          <Text className="font-sans text-[10px] uppercase tracking-[0.04em] text-muted">
            {h.type}
          </Text>
        </View>
        <Text numberOfLines={1} className="font-sans text-[11px] text-muted">
          {h.name} · {lotLabel(h)}
        </Text>
      </View>
      <Text className="font-sans text-[13px] tabular-nums text-ink">
        {h.qty}
      </Text>
      <NumericCell primary={h.cost[0]} secondary={h.cost[1] || undefined} />
      <NumericCell primary={h.price[0]} secondary={h.price[1] || undefined} />
      <NumericCell primary={h.mv[0]} secondary={h.mv[1] || undefined} />
      <NumericCell
        tone={plTone}
        lead={h.loss ? undefined : <LimeDot />}
        primary={h.pl[0]}
        note={h.plp}
        secondary={h.pl[1] || undefined}
      />
      <Button variant="outline" size="sm" label="Sell" onPress={() => {}} />
    </ExpandableRow>
  );
}

export function TablesGallery() {
  const [open, setOpen] = useState<Record<string, boolean>>({ VWRA: true });
  const [charted, setCharted] = useState('VWRA');
  // The tables are desktop-only (mobile gets cards), so on a phone the
  // gallery scrolls them sideways at desktop width.
  return (
    <ScrollView horizontal contentContainerClassName="w-[1000px]">
      <View className="flex-1 gap-y-4">
        <Card className="gap-0 p-card">
          <Text className="font-sans text-[13px] text-ink">Positions</Text>
          <TableHeader
            columns={positionsColumns}
            labels={[
              '',
              'Holding',
              'Qty',
              'Avg cost',
              'Price',
              'Market value',
              'Unrealised P&L',
              'Action',
            ]}
          />
          {holdings.map(h => (
            <Holding
              key={h.sym}
              h={h}
              open={!!open[h.sym]}
              selected={charted === h.sym}
              onToggle={() => setOpen(o => ({ ...o, [h.sym]: !o[h.sym] }))}
            />
          ))}
          <TotalsRow columns={positionsColumns}>
            <View />
            <Text className="font-sans text-[13px] text-ink">Total</Text>
            <View />
            <NumericCell
              tone="muted"
              primary="US$18,138.00"
              secondary="(S$24,508.07)"
            />
            <View />
            <NumericCell primary="US$19,369.50" secondary="(S$26,172.07)" />
            <NumericCell
              primary="+US$1,231.50"
              note="+6.8%"
              secondary="(+S$1,664.00)"
            />
            <View />
          </TotalsRow>
        </Card>

        <Card className="gap-0 p-card">
          <Text className="font-sans text-[13px] text-ink">Watchlist</Text>
          <TableHeader
            columns={watchlistColumns}
            labels={[
              'Symbol',
              '30-day trend',
              'Price',
              'Day change',
              'In portfolio',
            ]}
          />
          {watch.map(w => {
            const down = w.chg.startsWith('−');
            const colour = down ? tokens.colors.danger : tokens.colors.ink;
            return (
              <TableRow
                key={w.sym}
                columns={watchlistColumns}
                selected={charted === w.sym}
                onPress={w.held ? () => setCharted(w.sym) : undefined}
                accessibilityLabel={w.sym}
              >
                <View className="gap-[1px]">
                  <Text className="font-sans text-[13px] text-ink">
                    {w.sym}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="font-sans text-[11px] text-muted"
                  >
                    {w.name}
                  </Text>
                </View>
                <Svg
                  width={96}
                  height={22}
                  viewBox="0 0 48 22"
                  preserveAspectRatio="none"
                >
                  <Path d={spark} stroke={colour} strokeWidth={1} fill="none" />
                </Svg>
                <NumericCell
                  primary={w.price[0]}
                  secondary={w.price[1] || undefined}
                />
                <NumericCell tone={down ? 'danger' : 'ink'} primary={w.chg} />
                {w.held ? (
                  <View className="flex-row items-center gap-[6px]">
                    <View className="size-[6px] rounded-full bg-ink" />
                    <Text className="font-sans text-[11px] text-muted">
                      Held
                    </Text>
                  </View>
                ) : (
                  <View />
                )}
              </TableRow>
            );
          })}
        </Card>
      </View>
    </ScrollView>
  );
}
