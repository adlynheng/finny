import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { ChipRow } from '@/components/ui/ChipRow';
import { DatePicker } from '@/components/ui/DatePicker';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { cx } from '@/components/ui/cardChrome';
import { useAccounts } from '@/hooks/useAccounts';
import { useRecordSale } from '@/hooks/useSales';
import { today } from '@/lib/today';
import { consumeFifo } from '@/utils/derive/positions';
import type { Holding } from '@/utils/derive/portfolio';
import {
  centsToInput,
  formatDualMoney,
  formatMoney,
  inputToCents,
  sanitizeAmountInput,
} from '@/utils/format/money';

/** Where proceeds can go, with the kind the chip shows. */
const KIND: Record<string, string> = { Broker: 'Broker', Savings: 'Bank' };

const shares = (n: number) =>
  `${n.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${
    n === 1 ? 'share' : 'shares'
  }`;

/**
 * Selling some or all of a holding: quantity (All fills the holding), price
 * per share in the instrument's currency, where the proceeds go and the date.
 * The summary shows the proceeds and the realised P&L on the oldest lots
 * first, and what is left. Mount it only while open, so each opening starts
 * from the holding's latest price.
 */
export function SellSheet({
  holding,
  rate,
  onClose,
}: {
  holding: Holding;
  rate: number;
  onClose: (sold: boolean) => void;
}) {
  // Brokers first, then banks, as the design lists them.
  const accounts = (useAccounts().data ?? [])
    .filter(a => a.is_active && a.type in KIND)
    .sort((a, b) => Number(a.type !== 'Broker') - Number(b.type !== 'Broker'));
  const record = useRecordSale();
  const mobile = Platform.OS === 'ios';
  const h = holding;

  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState(
    h.priceCents === null ? '' : centsToInput(h.priceCents),
  );
  const [accountId, setAccountId] = useState<number | null>(null);
  const [date, setDate] = useState(today());

  const destination =
    accounts.find(a => a.id === accountId) ??
    accounts.find(a => a.id === h.accountId) ??
    accounts.find(a => a.type === 'Broker') ??
    accounts[0];
  const q = Number(sanitizeAmountInput(quantity)) || 0;
  const p = inputToCents(price) ?? 0;
  const over = q > h.quantity;
  const valid = q > 0 && !over && p > 0 && destination !== undefined;
  const costCents = valid ? consumeFifo(h.lots, q).costBasisCents : 0;
  const proceeds = valid ? Math.round(q * p * h.fx) : 0;
  const pnl = valid ? Math.round((q * p - costCents) * h.fx) : 0;
  const dual = (cents: number, signed = false) =>
    formatDualMoney(cents, rate, { currency: 'SGD', signed });

  const left = over
    ? 'That is more than you hold'
    : valid
    ? `${shares(h.quantity - q)} left after this sale${
        h.quantity === q ? ' · position closes' : ''
      }`
    : 'Enter a quantity and price';
  const otherCurrency = h.currency === 'USD' ? 'SGD' : 'USD';
  const alt =
    p > 0
      ? `≈ ${formatMoney(h.currency === 'USD' ? p * rate : p / rate, {
          currency: otherCurrency,
          decimals: 2,
        })} per share`
      : h.priceCents === null
      ? 'No price yet'
      : `Last price ${centsToInput(h.priceCents)}`;

  const save = () => {
    if (!valid) {
      return;
    }
    record.mutate(
      {
        instrumentId: h.instrument.id,
        accountId: destination.id,
        lots: h.lots,
        quantity: q,
        pricePerUnitCents: p,
        soldAt: date,
      },
      { onSuccess: () => onClose(true) },
    );
  };

  const proceedsLine = dual(proceeds);
  const pnlLine = dual(pnl, true);

  return (
    <Sheet
      open
      onClose={() => onClose(false)}
      title={`Sell ${h.symbol}`}
      subtitle={`${h.instrument.name} · you hold ${shares(h.quantity)}`}
      width="narrow"
      actions={{
        primary: {
          label: 'Record sale',
          onPress: save,
          disabled: !valid || record.isPending,
        },
      }}
    >
      <View className="flex-row gap-[10px] ios:flex-col ios:gap-sheet-gap">
        <Input
          testID="sell-qty"
          label="Quantity"
          placeholder="0"
          keyboardType="decimal-pad"
          value={quantity}
          onChangeText={t => setQuantity(sanitizeAmountInput(t))}
          className="flex-1 ios:flex-none"
          trailing={
            <Pressable
              testID="sell-all"
              accessibilityRole="button"
              accessibilityLabel="Sell all"
              onPress={() => setQuantity(String(h.quantity))}
              className="rounded-5 bg-soft px-[9px] py-[5px] hover:bg-soft-hover ios:rounded-6 ios:px-[10px] ios:py-[6px]"
            >
              <Text className="font-sans text-[11px] text-ink ios:text-[12px]">
                All
              </Text>
            </Pressable>
          }
        />
        <View className="flex-1 gap-y-[6px] ios:flex-none">
          <Input
            testID="sell-price"
            label="Price per share"
            prefix={h.currency === 'USD' ? 'US$' : 'S$'}
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={price}
            onChangeText={t => setPrice(sanitizeAmountInput(t))}
          />
          <Text testID="sell-alt" className="font-sans text-[11px] text-muted">
            {alt}
          </Text>
        </View>
      </View>
      <FormField label="Proceeds go to">
        <ChipRow
          testID="sell-to"
          options={accounts.map(a => ({
            value: String(a.id),
            label: a.name,
            sub: KIND[a.type],
          }))}
          value={destination ? String(destination.id) : null}
          onChange={v => setAccountId(Number(v))}
        />
      </FormField>
      <DatePicker label="Date sold" value={date} onChange={setDate} />
      <View
        testID="sell-summary"
        className="gap-y-[8px] rounded-10 bg-ink/[.035] p-[14px] ios:rounded-12 ios:border ios:border-ink/[.06] ios:bg-white"
      >
        <SummaryLine
          label="Proceeds"
          value={proceedsLine}
          testID="sell-proceeds"
        />
        <SummaryLine
          label={mobile ? 'Realised P&L' : 'Realised P&L · oldest lots first'}
          value={pnlLine}
          loss={pnl < 0}
          testID="sell-pnl"
        />
        <Text
          testID="sell-left"
          className={cx(
            'font-sans text-[11px]',
            over ? 'text-danger' : 'text-muted',
          )}
        >
          {mobile ? 'Oldest lots first · ' : ''}
          {left}
          {destination ? ` · to ${destination.name}` : ''}
        </Text>
      </View>
      {record.isError && (
        <Text testID="sell-error" className="font-sans text-[12px] text-danger">
          Couldn’t record the sale. Try again.
        </Text>
      )}
    </Sheet>
  );
}

function SummaryLine({
  label,
  value,
  loss = false,
  testID,
}: {
  label: string;
  value: { primary: string; secondary: string | null };
  loss?: boolean;
  testID: string;
}) {
  return (
    <View className="flex-row items-baseline justify-between gap-x-[8px]">
      <Text className="font-sans text-[13px] text-muted">{label}</Text>
      <Text
        testID={testID}
        className={cx(
          'font-sans text-[13px] tabular-nums',
          loss ? 'text-danger' : 'text-ink',
        )}
      >
        {value.primary}{' '}
        <Text className="text-[12px] text-muted ios:text-[13px]">
          {value.secondary}
        </Text>
      </Text>
    </View>
  );
}
