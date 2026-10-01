import { useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { ChipRow } from '@/components/ui/ChipRow';
import { DatePicker } from '@/components/ui/DatePicker';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { cx } from '@/components/ui/cardChrome';
import { useDebounced } from '@/hooks/useDebounced';
import { useInstruments } from '@/hooks/useInstruments';
import { useAddPosition } from '@/hooks/usePositions';
import { useAddToWatchlist } from '@/hooks/useWatchlist';
import { useUsListings } from '@/hooks/useUsListings';
import { searchListings, type Listing } from '@/lib/listings';
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
import { LIST_SHADOW } from './SymbolPicker';
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
  'Energy',
  'Consumer',
  'Real estate',
  'Materials',
  'Industrials',
  'Healthcare',
  'Broad market',
].map(s => ({ value: s, label: s }));

/** How long the symbol field waits after the last keystroke before searching. */
export const SEARCH_DEBOUNCE_MS = 300;
/** Between the fields and the floating matches. */
const MATCHES_OFFSET = 6;

const shares = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 4 });

/**
 * One form for three cases: a lot for a held symbol, a first position in a
 * known symbol (say, from the watchlist), or a new symbol. Picking a chip
 * fills the form from that instrument. Typing a symbol searches every US
 * listing by symbol and name; picking a match fills its symbol and name (or,
 * for a symbol already known, the whole form as a chip does). A symbol with
 * no match, such as an SGX listing, can still be typed in full. A held symbol's market, type and
 * industry are already known, so they lock. Saving shows the Positions tab
 * with the symbol open.
 *
 * With `watch` it is the watchlist's New symbol form instead: the same symbol,
 * market, type and industry, but no quantity, price or date, and saving only
 * watches the symbol. A symbol already listed (held or watched) cannot be
 * added again.
 */
export function AddPositionSheet({
  book,
  watch = false,
  onClose,
  onAdded,
}: {
  book: Book;
  watch?: boolean;
  onClose: () => void;
  onAdded: (symbol: string) => void;
}) {
  const instruments = useInstruments().data ?? [];
  const addLot = useAddPosition();
  const addWatch = useAddToWatchlist();
  const add = watch ? addWatch : addLot;

  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [kind, setKind] = useState<InstrumentKind>('Stock');
  const [sector, setSector] = useState('Tech');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(today());
  // Typing opens the matches; picking one, or a chip, closes them.
  const [searching, setSearching] = useState(false);
  // Where the Symbol and Name row ends, for the matches to float under it.
  const [fieldsBottom, setFieldsBottom] = useState(0);

  const listings = useUsListings();
  const query = useDebounced(symbol, SEARCH_DEBOUNCE_MS);
  const matches = useMemo(
    () => (searching ? searchListings(listings.data ?? [], query) : []),
    [searching, listings.data, query],
  );

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
  const listed = book.watched.some(i => i.symbol === symbol);
  const valid = watch
    ? symbol !== '' && name.trim() !== '' && !listed
    : symbol !== '' && (locked || name.trim() !== '') && q > 0 && p > 0;
  const total = formatDualMoney(
    Math.round(q * p * fxFor(shown.currency, book.rate)),
    book.rate,
    { currency: 'SGD' },
  );

  const fill = (i: InstrumentRow) => {
    const quote = book.quotes[i.symbol];
    setSearching(false);
    setSymbol(i.symbol);
    setName(i.name ?? '');
    setCurrency(currencyOf(i));
    if (isOneOf(INSTRUMENT_KINDS, i.kind)) setKind(i.kind);
    if (i.sector) setSector(i.sector);
    if (quote) setPrice(centsToInput(quote.priceCents));
  };

  const pick = (l: Listing) => {
    const same =
      book.holdings.find(h => h.symbol === l.symbol)?.instrument ??
      instruments.find(i => i.symbol === l.symbol);
    if (same) {
      fill(same);
      return;
    }
    setSearching(false);
    setSymbol(l.symbol);
    setName(l.name);
    setCurrency('USD');
    setKind(l.etf ? 'ETF' : 'Stock');
  };

  const note = watch
    ? listed
      ? `${symbol} is already on your watchlist`
      : known
      ? lastPrice(known, book)
      : symbol
      ? 'New symbol'
      : 'Pick a symbol or type one'
    : held
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
    const instrument = {
      symbol,
      name: name.trim() || known?.name || symbol,
      currency: shown.currency,
      exchange: shown.currency === 'SGD' ? 'SGX' : null,
      kind: shown.kind,
      sector: shown.sector,
    };
    if (watch) {
      addWatch.mutate(instrument, { onSuccess: () => onAdded(symbol) });
      return;
    }
    addLot.mutate(
      {
        instrument,
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
      title={watch ? 'New symbol' : 'New position'}
      width="wide"
      note={
        <View className="gap-y-[2px]">
          {!watch && (
            <Text
              testID="add-total"
              className="font-sans text-[13px] tabular-nums text-ink ios:text-[20px] ios:font-light"
            >
              {total.primary}{' '}
              <Text className="text-[12px] font-normal text-muted ios:text-[13px]">
                {total.secondary}
              </Text>
            </Text>
          )}
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
          label: watch ? 'Add to watchlist' : held ? 'Add lot' : 'Add position',
          onPress: save,
          disabled: !valid || add.isPending,
        },
      }}
    >
      <View
        onLayout={e =>
          setFieldsBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)
        }
        className="flex-row gap-[10px] ios:gap-[8px]"
      >
        <Input
          testID="add-symbol"
          label="Symbol"
          placeholder="e.g. VOO"
          autoCapitalize="characters"
          autoCorrect={false}
          value={symbol}
          onChangeText={t => {
            setSymbol(t.toUpperCase().replace(/[^A-Z0-9.]/g, ''));
            setSearching(true);
          }}
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
      {/* Everything here is already watched, so the watchlist's form has no use for it. */}
      {!watch && (
        <FormField label="From your watchlist and holdings">
          <ChipRow
            testID="add-quick"
            options={book.watched.map(i => ({
              value: i.symbol,
              label: i.symbol,
            }))}
            value={listed ? symbol : null}
            onChange={s => fill(book.watched.find(i => i.symbol === s)!)}
          />
        </FormField>
      )}
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
      {!watch && (
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
      )}
      {add.isError && (
        <Text testID="add-error" className="font-sans text-[12px] text-danger">
          Couldn’t save the {watch ? 'symbol' : 'position'}. Try again.
        </Text>
      )}
      {/* Last, so it draws over the fields below. It floats in the form
          rather than in the row, where it would fall outside the row's
          bounds and miss presses. */}
      {searching && symbol !== '' && (
        <Matches
          top={fieldsBottom + MATCHES_OFFSET}
          matches={matches}
          loading={listings.isPending}
          onPick={pick}
        />
      )}
    </Sheet>
  );
}

/**
 * The symbol search's results, floating under the Symbol field over the rest
 * of the form: symbol, name and an ETF tag. While the list is loading it says
 * so; with no match (or no list) it shows nothing, and whatever was typed
 * stands.
 */
function Matches({
  top,
  matches,
  loading,
  onPick,
}: {
  top: number;
  matches: readonly Listing[];
  loading: boolean;
  onPick: (l: Listing) => void;
}) {
  if (matches.length === 0 && !loading) {
    return null;
  }
  return (
    <View
      testID="add-matches"
      // Measured, so not a class.
      style={{
        top,
        boxShadow: Platform.OS === 'ios' ? LIST_SHADOW.ios : LIST_SHADOW.macos,
      }}
      className="absolute inset-x-0 z-10 gap-y-[2px] rounded-8 border border-input-border bg-white p-[4px] ios:rounded-10"
    >
      {matches.length === 0 ? (
        <Text
          testID="add-matches-loading"
          className="px-[10px] py-[7px] font-sans text-[12px] text-muted"
        >
          Loading US listings…
        </Text>
      ) : (
        matches.map(l => (
          <Pressable
            key={l.symbol}
            testID={`add-match-${l.symbol}`}
            accessibilityRole="button"
            accessibilityLabel={`${l.symbol}, ${l.name}`}
            onPress={() => onPick(l)}
            className="flex-row items-center gap-x-[10px] rounded-6 px-[10px] py-[7px] hover:bg-ink/5 ios:min-h-[42px] ios:rounded-8 ios:py-0"
          >
            <Text className="w-[52px] font-sans text-[13px] text-ink ios:text-[14px]">
              {l.symbol}
            </Text>
            <Text
              numberOfLines={1}
              className="min-w-0 flex-1 font-sans text-[12px] text-muted ios:text-[13px]"
            >
              {l.name}
            </Text>
            {l.etf && (
              <Text className="font-sans text-[10px] uppercase tracking-[0.04em] text-muted">
                ETF
              </Text>
            )}
          </Pressable>
        ))
      )}
    </View>
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
