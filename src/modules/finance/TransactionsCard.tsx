import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { getDate } from 'date-fns';

import { Icon } from '@/components/icons/Icon';
import { PlusIcon } from '@/components/icons/PlusIcon';
import { categoryIcon, transactionIcon } from '@/components/icons/registry';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cx } from '@/components/ui/cardChrome';
import { AddButton, EmptyNote, GhostRows } from '@/components/ui/Empty';
import { noFocusRing } from '@/components/ui/Input';
import { MonthStepper } from '@/components/ui/MonthStepper';
import { Segmented } from '@/components/ui/Segmented';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { today } from '@/lib/today';
import {
  useUiStore,
  type TransactionsFilter,
  type TransactionsView,
} from '@/stores/uiStore';
import { tokens } from '@/theme/tokens';
import type { CategoryKind } from '@/types/domain';
import {
  groupCategories,
  monthTotals,
  type CategoryGroup,
  type CategoryRowSummary,
} from '@/utils/derive/cashflow';
import {
  formatMonthShort,
  monthKey,
  parseDate,
  shiftMonth,
} from '@/utils/format/date';
import { formatMoney, formatSignedMoney } from '@/utils/format/money';
import { filterRows, listRows, type TxnListRow } from './transactionRows';

const VIEWS = [
  { value: 'list', label: 'List' },
  { value: 'categories', label: 'Categories' },
] as const;

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'in', label: 'In' },
  { value: 'out', label: 'Out' },
  { value: 'transfers', label: 'Transfers' },
] as const;

/** The month stepper reaches back this far, as the design's does. */
const MONTHS_BACK = 2;

/** `+S$12.50` in, `−S$12.50` out, and a transfer unsigned. */
function signedAmount(row: TxnListRow) {
  return row.kind === 'transfer'
    ? formatMoney(row.amount_cents, { decimals: 2 })
    : formatSignedMoney(row.amount_cents, { decimals: 2 });
}

/**
 * The plain glass card: the month's transactions as a list (searchable, and
 * filtered to money in, out or transfers) or grouped by category. View,
 * filter, search and month live in the UI store, so switching views keeps
 * them. A category row is a shortcut back to the list: it sets the view, the
 * In or Out filter and the search together.
 *
 * Before the first transaction it is the design's empty card: no views, month
 * or search to use, zero totals, dashed rows and a note on what logging one
 * does.
 */
export function TransactionsCard() {
  const month = useUiStore(s => s.transactionsMonth);
  const view = useUiStore(s => s.transactionsView);
  const setUi = useUiStore(s => s.set);
  const txns = useTransactions(month).data;
  // Every transaction, shared with the cash flow card: none at all is the empty card.
  const ledger = useTransactions().data;
  const empty = ledger?.length === 0;
  const accounts = useAccounts().data ?? [];
  const categories = useCategories().data ?? [];
  const thisMonth = monthKey(today());
  const mobile = Platform.OS === 'ios';

  const views = (
    <Segmented
      testID="tx-view"
      size="compact"
      options={VIEWS}
      value={view}
      onChange={v => setUi({ transactionsView: v as TransactionsView })}
    />
  );
  const stepper = (
    <MonthStepper
      testID="tx-month"
      month={month}
      min={shiftMonth(thisMonth, -MONTHS_BACK)}
      max={thisMonth}
      onChange={m => setUi({ transactionsMonth: m })}
    />
  );
  const add = (
    <Button
      testID="tx-add"
      variant="primary"
      size="sm"
      label={mobile ? 'Add' : 'Add transaction'}
      icon={plus}
      onPress={() => setUi({ newTransactionOpen: true })}
      className="ios:h-[40px] ios:rounded-10 ios:px-[14px]"
    />
  );

  return (
    <Card testID="tx-card" className="flex-1 pb-[6px] pt-[16px] ios:p-[16px]">
      {/* The controls wrap under the title when the card is narrow. */}
      <View className="flex-row flex-wrap items-center justify-between gap-x-[8px] gap-y-[8px]">
        <View className="flex-row items-center gap-x-[10px]">
          <Text className="font-sans text-[13px] text-ink">Transactions</Text>
          {!mobile && !empty && views}
        </View>
        {empty ? (
          add
        ) : mobile ? (
          views
        ) : (
          <View className="flex-row items-center gap-x-[6px]">
            {stepper}
            {add}
          </View>
        )}
      </View>
      {empty && <EmptyTransactions />}
      {mobile && !empty && (
        <View className="mt-[10px] flex-row items-center justify-between gap-x-[8px]">
          {stepper}
          {add}
        </View>
      )}
      {txns &&
        !empty &&
        (view === 'list' ? (
          <ListView
            rows={listRows(txns, { accounts, categories })}
            mobile={mobile}
          />
        ) : (
          <CategoriesView
            groups={groupCategories(txns, categories)}
            iconKeys={new Map(categories.map(c => [c.id, c.icon]))}
            mobile={mobile}
          />
        ))}
    </Card>
  );
}

/** No transactions at all: zero totals, dashed rows, and a first one to add. */
function EmptyTransactions() {
  const setUi = useUiStore(s => s.set);
  return (
    <View testID="tx-ledger-empty" className="min-h-0 flex-1">
      <View className="mt-[12px] flex-row gap-x-[14px] pb-[8px]">
        <Text className="font-sans text-[12px] text-muted">
          In <Text className="text-ink">{formatMoney(0)}</Text>
        </Text>
        <Text className="font-sans text-[12px] text-muted">
          Out <Text className="text-ink">{formatMoney(0)}</Text>
        </Text>
        <Text className="ml-auto font-sans text-[12px] text-muted">
          0 transactions
        </Text>
      </View>
      <GhostRows count={4} tone="glass" />
      <EmptyNote
        tone="glass"
        className="mb-[12px] mt-auto pt-[14px] ios:mb-0"
        title="No transactions yet"
        body="Log an expense, deposit or transfer. Each one lands here, counts against your limit and feeds the cash flow chart."
        action={
          <AddButton
            testID="tx-add-first"
            label="Add your first transaction"
            onPress={() => setUi({ newTransactionOpen: true })}
          />
        }
      />
    </View>
  );
}

const plus = (color: string) => (
  <PlusIcon size={10} color={color} strokeWidth={1.4} />
);

function ListView({ rows, mobile }: { rows: TxnListRow[]; mobile: boolean }) {
  const filter = useUiStore(s => s.transactionsFilter);
  const search = useUiStore(s => s.transactionsSearch);
  const setUi = useUiStore(s => s.set);
  const shown = filterRows(rows, filter, search);
  const { inCents, outCents } = monthTotals(shown);

  return (
    <View className="min-h-0 flex-1">
      <View className="mt-[10px] flex-row gap-x-[6px] ios:flex-col ios:gap-y-[8px]">
        <View className="h-[30px] min-w-0 flex-1 flex-row items-center gap-x-[8px] rounded-6 bg-nav-tray px-[10px] ios:h-[42px] ios:flex-none ios:rounded-10 ios:px-[12px]">
          <SearchIcon />
          <TextInput
            testID="tx-search"
            accessibilityLabel="Search transactions"
            value={search}
            onChangeText={t => setUi({ transactionsSearch: t })}
            placeholder={mobile ? 'Search transactions' : 'Search'}
            placeholderTextColor={tokens.colors.muted2}
            {...noFocusRing}
            className="min-w-0 flex-1 p-0 font-sans text-[12px] text-ink ios:text-[14px]"
          />
        </View>
        <Segmented
          testID="tx-filter"
          size={mobile ? 'field' : 'compact'}
          options={FILTERS}
          value={filter}
          onChange={f => setUi({ transactionsFilter: f as TransactionsFilter })}
        />
      </View>
      <View className="mt-[10px] flex-row gap-x-[14px] pb-[8px] ios:mt-[12px]">
        <Text testID="tx-in" className="font-sans text-[12px] text-muted">
          In{' '}
          <Text className="text-ink">
            {formatMoney(inCents, { decimals: 2 })}
          </Text>
        </Text>
        <Text testID="tx-out" className="font-sans text-[12px] text-muted">
          Out{' '}
          <Text className="text-ink">
            {formatMoney(outCents, { decimals: 2 })}
          </Text>
        </Text>
        <Text
          testID="tx-count"
          className="ml-auto font-sans text-[12px] text-muted"
        >
          {shown.length} {shown.length === 1 ? 'item' : 'items'}
        </Text>
      </View>
      <ScrollView
        className="min-h-0 flex-1 ios:flex-none"
        showsVerticalScrollIndicator={false}
        scrollEnabled={!mobile}
      >
        {shown.map(r => (
          <TxnRowView key={r.id} row={r} mobile={mobile} />
        ))}
        {shown.length === 0 && <Empty text="No transactions match." />}
      </ScrollView>
    </View>
  );
}

function TxnRowView({ row, mobile }: { row: TxnListRow; mobile: boolean }) {
  const day = getDate(parseDate(row.date));
  const mon = formatMonthShort(row.date);
  const icon = <IconTile path={transactionIcon(row.kind, row.iconKey)} />;
  return (
    <View
      testID={`tx-row-${row.id}`}
      className="flex-row items-center gap-x-[12px] border-t border-row-border py-[8px] ios:py-[10px]"
    >
      {mobile ? (
        icon
      ) : (
        <View className="w-[34px] items-center gap-y-[2px]">
          <Text className="font-sans text-[18px] leading-[18px] tracking-[-0.01em] tabular-nums text-ink">
            {day}
          </Text>
          <Text className="font-sans text-[10px] uppercase leading-[10px] tracking-[0.04em] text-muted">
            {mon}
          </Text>
        </View>
      )}
      <View className="min-w-0 flex-1 gap-y-[1px]">
        <Text
          numberOfLines={1}
          className="font-sans text-[13px] text-ink ios:text-[14px]"
        >
          {row.description}
        </Text>
        <Text
          testID={`tx-row-${row.id}-meta`}
          numberOfLines={1}
          className="font-sans text-[11px] text-muted"
        >
          {mobile ? `${day} ${mon} · ` : ''}
          {row.category} · {row.account}
        </Text>
      </View>
      <View className="flex-row items-center gap-x-[6px]">
        {row.kind === 'deposit' && (
          <View
            testID={`tx-row-${row.id}-in`}
            className="size-[6px] rounded-full bg-lime-dark"
          />
        )}
        <Text
          testID={`tx-row-${row.id}-amount`}
          className="font-sans text-[13px] tabular-nums text-ink ios:text-[14px]"
        >
          {signedAmount(row)}
        </Text>
      </View>
      {!mobile && icon}
    </View>
  );
}

function CategoriesView({
  groups,
  iconKeys,
  mobile,
}: {
  groups: { spending: CategoryGroup; income: CategoryGroup };
  iconKeys: Map<number, string | null>;
  mobile: boolean;
}) {
  const setUi = useUiStore(s => s.set);
  const shown = [
    { label: 'Spending', kind: 'expense' as const, group: groups.spending },
    { label: 'Income', kind: 'deposit' as const, group: groups.income },
  ].filter(g => g.group.rows.length > 0);

  const open = (kind: CategoryKind, row: CategoryRowSummary) =>
    setUi({
      transactionsView: 'list',
      transactionsFilter: kind === 'deposit' ? 'in' : 'out',
      // "Other income" is a bucket, not text in any row.
      transactionsSearch: row.label === 'Other income' ? '' : row.label,
    });

  return (
    <View className="min-h-0 flex-1">
      <View className="mt-[12px] flex-row flex-wrap gap-x-[14px] pb-[8px]">
        <Text testID="tx-spent" className="font-sans text-[12px] text-muted">
          Spent{' '}
          <Text className="text-ink">
            {formatMoney(groups.spending.totalCents, { decimals: 2 })}
          </Text>
        </Text>
        <Text testID="tx-received" className="font-sans text-[12px] text-muted">
          Received{' '}
          <Text className="text-ink">
            {formatMoney(groups.income.totalCents, { decimals: 2 })}
          </Text>
        </Text>
        <Text className="ml-auto font-sans text-[12px] text-muted">
          Transfers excluded
        </Text>
      </View>
      <ScrollView
        className="min-h-0 flex-1 ios:flex-none"
        contentContainerClassName="gap-y-[14px] pb-[10px]"
        showsVerticalScrollIndicator={false}
        scrollEnabled={!mobile}
      >
        {shown.map(g => (
          <View key={g.label} testID={`tx-group-${g.kind}`}>
            <View className="flex-row items-baseline justify-between pb-[6px] pt-[4px]">
              <Text className="font-sans text-[11px] uppercase tracking-[0.06em] text-muted">
                {g.label}
              </Text>
              <Text className="font-sans text-[11px] text-muted">
                {g.group.rows.length}{' '}
                {g.group.rows.length === 1 ? 'category' : 'categories'}
              </Text>
            </View>
            {g.group.rows.map(r => (
              <Pressable
                key={r.label}
                testID={`tx-cat-${g.kind}-${r.label}`}
                accessibilityRole="button"
                onPress={() => open(g.kind, r)}
                className="-mx-[6px] flex-row items-center gap-x-[12px] rounded-6 border-t border-row-border px-[6px] py-[8px] hover:bg-ink/[.035] ios:mx-0 ios:px-0 ios:py-[10px]"
              >
                <IconTile
                  path={categoryIcon(
                    g.kind,
                    r.categoryId === null
                      ? r.label
                      : iconKeys.get(r.categoryId) ?? r.label,
                  )}
                />
                <View className="min-w-0 flex-1 gap-y-[6px]">
                  <View className="flex-row items-baseline gap-x-[8px]">
                    <Text className="font-sans text-[13px] text-ink ios:text-[14px]">
                      {r.label}
                    </Text>
                    <Text className="font-sans text-[11px] text-muted">
                      {r.count} {r.count === 1 ? 'item' : 'items'}
                    </Text>
                    <Text
                      testID={`tx-cat-${g.kind}-${r.label}-amount`}
                      className="ml-auto font-sans text-[13px] tabular-nums text-ink ios:text-[14px]"
                    >
                      {g.kind === 'deposit' ? '+' : ''}
                      {formatMoney(r.cents, { decimals: 2 })}
                    </Text>
                  </View>
                  <View className="h-[3px] rounded-[2px] bg-ink/[.06]">
                    <View
                      testID={`tx-cat-${g.kind}-${r.label}-bar`}
                      className={cx(
                        'absolute inset-y-0 left-0 rounded-[2px]',
                        g.kind === 'deposit' ? 'bg-lime-dark' : 'bg-ink',
                      )}
                      // The row against the group's largest: data, so not a class.
                      style={{ width: `${r.fractionOfMax * 100}%` }}
                    />
                  </View>
                </View>
                <Text className="w-[34px] text-right font-sans text-[11px] tabular-nums text-muted ios:w-[32px]">
                  {Math.round(r.fractionOfTotal * 100)}%
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
        {shown.length === 0 && (
          <Empty text="No spending or income this month." />
        )}
      </ScrollView>
    </View>
  );
}

/** A row's 32px icon tile (34px on mobile). */
function IconTile({ path }: { path: string }) {
  return (
    <View className="size-[32px] items-center justify-center rounded-8 bg-ink/[.045] ios:size-[34px] ios:rounded-9">
      <Icon path={path} size={16} />
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Text
      testID="tx-empty"
      className="py-[24px] text-center font-sans text-[13px] text-muted"
    >
      {text}
    </Text>
  );
}

function SearchIcon() {
  const size = Platform.OS === 'ios' ? 13 : 12;
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle
        cx={7}
        cy={7}
        r={4.5}
        stroke={tokens.colors.muted}
        strokeWidth={1.3}
      />
      <Path
        d="M10.5 10.5L14 14"
        stroke={tokens.colors.muted}
        strokeWidth={1.3}
      />
    </Svg>
  );
}
