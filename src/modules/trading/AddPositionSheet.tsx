import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { ChipRow } from '@/components/ui/ChipRow';
import { DatePicker } from '@/components/ui/DatePicker';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { cx } from '@/components/ui/cardChrome';
import { useInstruments } from '@/hooks/useInstruments';
import { useAddPosition } from '@/hooks/usePositions';
import { today } from '@/lib/today';
import {
  INSTRUMENT_KINDS,
  isOneOf,
  type InstrumentKind,
  type InstrumentRow,
} from '@/types/domain';
import { currencyOf, fxFor } from '@/utils/derive/portfolio';
import {
  centsToInput,
  formatDualMoney,
  inputToCents,
  sanitizeAmountInput,
  type Currency,
} from '@/utils/format/money';
import type { Book } from './useTradingBook';

const MARKETS = [
  { value: 'USD', label: 'US-listed' },
  { value: 'SGD', label: 'SGX' },
] as const;

const KINDS = INSTRUMENT_KINDS.map(k => ({ value: k, label: k }));

/** The design's industries. */
const INDUSTRIES = [
  'Tech',
  'Financials',
  'Consumer',
  'Real estate',
  'Industrials',
  'Healthcare',
  'Broad market',
].map(s => ({ value: s, label: s }));

const shares = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 4 });

/**
 * One form for three cases: a lot for a held symbol, a first position in a
 * known symbol (say, from the watchlist), or a new symbol. Picking a chip
 * fills the form from that instrument. A held symbol's market, type and
 * industry are already known, so they lock. Saving shows the Positions tab
 * with the symbol open.
 */
export function AddPositionSheet({
  book,
  onClose,
  onAdded,
}: {
  book: Book;
  onClose: () => void;
  onAdded: (symbol: string) => void;
}) {
  const instruments = useInstruments().data ?? [];
  const add = useAddPosition();

  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [kind, setKind] = useState<InstrumentKind>('Stock');
  const [sector, setSector] = useState('Tech');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(today());

  const held = book.holdings.find(h => h.symbol === symbol);
  const known = held?.instrument ?? instruments.find(i => i.symbol === symbol);
  const locked = held !== undefined;
  const shown = locked
    ? {
        currency: held.currency,
        kind: isOneOf(INSTRUMENT_KINDS, held.instrument.kind)
          ? held.instrument.kind
          : kind,
        sector: held.instrument.sector ?? sector,
      }
    : { currency, kind, sector };

  const q = Number(sanitizeAmountInput(quantity)) || 0;
  const p = inputToCents(price) ?? 0;
  const valid =
    symbol !== '' && (locked || name.trim() !== '') && q > 0 && p > 0;
  const total = formatDualMoney(
    Math.round(q * p * fxFor(shown.currency, book.rate)),
    book.rate,
    { currency: 'SGD' },
  );

  const fill = (i: InstrumentRow) => {
    const quote = book.quotes[i.symbol];
    setSymbol(i.symbol);
    setName(i.name ?? '');
    setCurrency(currencyOf(i));
    if (isOneOf(INSTRUMENT_KINDS, i.kind)) setKind(i.kind);
    if (i.sector) setSector(i.sector);
    if (quote) setPrice(centsToInput(quote.priceCents));
  };

  const note = held
    ? `Adds a lot to your ${symbol} position (${shares(
        held.quantity,
      )} shares held)`
    : known
    ? lastPrice(known, book)
    : symbol
    ? 'New holding'
    : 'Pick a symbol or type one';

  const save = () => {
    if (!valid) {
      return;
    }
    add.mutate(
      {
        instrument: {
          symbol,
          name: name.trim() || known?.name || symbol,
          currency: shown.currency,
          exchange: shown.currency === 'SGD' ? 'SGX' : null,
          kind: shown.kind,
          sector: shown.sector,
        },
        quantity: q,
        costPerUnitCents: p,
        purchasedAt: date,
      },
      { onSuccess: () => onAdded(symbol) },
    );
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="New position"
      width="wide"
      note={
        <View className="gap-y-[2px]">
          <Text
            testID="add-total"
            className="font-sans text-[13px] tabular-nums text-ink ios:text-[20px] ios:font-light"
          >
            {total.primary}{' '}
            <Text className="text-[12px] font-normal text-muted ios:text-[13px]">
              {total.secondary}
            </Text>
          </Text>
          <Text
            testID="add-note"
            className="font-sans text-[11px] text-muted ios:text-[12px]"
          >
            {note}
          </Text>
        </View>
      }
      actions={{
        primary: {
          label: held ? 'Add lot' : 'Add position',
          onPress: save,
          disabled: !valid || add.isPending,
        },
      }}
    >
      <View className="flex-row gap-[10px] ios:gap-[8px]">
        <Input
          testID="add-symbol"
          label="Symbol"
          placeholder="e.g. VOO"
          autoCapitalize="characters"
          autoCorrect={false}
          value={symbol}
          onChangeText={t =>
            setSymbol(t.toUpperCase().replace(/[^A-Z0-9.]/g, ''))
          }
          className="flex-1 ios:flex-[0.8]"
        />
        <Input
          testID="add-name"
          label="Name"
          placeholder="e.g. Vanguard S&P 500"
          value={name}
          onChangeText={setName}
          className="flex-[1.6] ios:flex-[1.4]"
        />
      </View>
      <FormField label="From your watchlist and holdings">
        <ChipRow
          testID="add-quick"
          options={book.watched.map(i => ({
            value: i.symbol,
            label: i.symbol,
          }))}
          value={book.watched.some(i => i.symbol === symbol) ? symbol : null}
          onChange={s => fill(book.watched.find(i => i.symbol === s)!)}
        />
      </FormField>
      <View className="flex-row gap-[10px] ios:flex-col ios:gap-sheet-gap">
        <Locked locked={locked} className="flex-1 ios:flex-none">
          <FormField label="Market">
            <Segmented
              testID="add-market"
              options={MARKETS}
              value={shown.currency}
              onChange={setCurrency}
            />
          </FormField>
        </Locked>
        <Locked locked={locked} className="flex-1 ios:flex-none">
          <FormField label="Instrument">
            <Segmented
              testID="add-kind"
              options={KINDS}
              value={shown.kind}
              onChange={setKind}
            />
          </FormField>
        </Locked>
      </View>
      <Locked locked={locked}>
        <FormField label="Industry">
          <ChipRow
            testID="add-industry"
            options={INDUSTRIES}
            value={shown.sector}
            onChange={setSector}
          />
        </FormField>
      </Locked>
      {/* Desktop: quantity, price and date in one row (.7 : 1 : 1.3). Mobile:
          quantity and price side by side, the date under them. */}
      <View className="flex-row items-start gap-[10px] ios:flex-col ios:items-stretch ios:gap-sheet-gap">
        <View className="flex-[1.7] flex-row gap-[10px] ios:flex-none ios:gap-[8px]">
          <Input
            testID="add-qty"
            label="Quantity"
            placeholder="0"
            keyboardType="decimal-pad"
            value={quantity}
            onChangeText={t => setQuantity(sanitizeAmountInput(t))}
            className="flex-[0.7] ios:flex-1"
          />
          <Input
            testID="add-price"
            label="Price per share"
            prefix={shown.currency === 'USD' ? 'US$' : 'S$'}
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={price}
            onChangeText={t => setPrice(sanitizeAmountInput(t))}
            className="flex-1"
          />
        </View>
        <DatePicker
          label="Date bought"
          value={date}
          onChange={setDate}
          className="flex-[1.3] ios:flex-none"
        />
      </View>
      {add.isError && (
        <Text testID="add-error" className="font-sans text-[12px] text-danger">
          Couldn’t save the position. Try again.
        </Text>
      )}
    </Sheet>
  );
}

/** A known instrument's name and last price. */
function lastPrice(i: InstrumentRow, book: Book) {
  const quote = book.quotes[i.symbol];
  const name = i.name ?? i.symbol;
  return quote
    ? `${name} · last ${
        formatDualMoney(quote.priceCents, book.rate, {
          currency: currencyOf(i),
          decimals: 2,
        }).primary
      }`
    : name;
}

/** A held symbol's market, type and industry: faded and not choosable. */
function Locked({
  locked,
  className,
  children,
}: {
  locked: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <View
      testID={locked ? 'add-locked' : undefined}
      pointerEvents={locked ? 'none' : 'auto'}
      className={cx(locked && 'opacity-50', className)}
    >
      {children}
    </View>
  );
}
