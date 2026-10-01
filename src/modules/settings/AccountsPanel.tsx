import { useState } from 'react';
import { Platform } from 'react-native';

import { accountTypeIcons } from '@/components/icons/registry';
import { useUiStore } from '@/stores/uiStore';
import { ACCOUNT_TYPES, type AccountRow } from '@/types/domain';
import { MINUS, formatMoney, formatPercent } from '@/utils/format/money';
import { AccountSheet } from './AccountSheet';
import { GroupGrid, PanelFrame, PanelGroup, PanelRow } from './PanelParts';
import type { PanelHead, SettingsData } from './useSettingsData';

const CREDIT_CARD = 'Credit card';

/** A credit card's balance is owed: shown negated, to the cent. */
function balanceText(a: AccountRow) {
  const cents = Math.abs(a.balance_cents ?? 0);
  return a.type === CREDIT_CARD
    ? `${MINUS}${formatMoney(cents, { decimals: 2 })}`
    : formatMoney(a.balance_cents ?? 0);
}

/**
 * Accounts & balances: one group per account type in the fixed order, each
 * with its total, and a row per account with its balance and share of
 * assets (a credit card's owed balance negated, and "liability"). Hovering a
 * row lights its segment in the Share of assets card, and the card's hover
 * lights the row. A row opens the account drawer; New account opens it empty.
 */
export function AccountsPanel({
  data,
  head,
}: {
  data: SettingsData;
  head: PanelHead;
}) {
  const hovered = useUiStore(s => s.hoveredAccountId);
  const setUi = useUiStore(s => s.set);
  // The drawer: an account to edit, 'new', or closed.
  const [open, setOpen] = useState<AccountRow | 'new' | null>(null);
  const desktop = Platform.OS !== 'ios';

  const groups = ACCOUNT_TYPES.map(type => ({
    type,
    rows: data.accounts.filter(a => a.type === type),
  })).filter(g => g.rows.length > 0);

  return (
    <PanelFrame
      head={head}
      onAction={() => setOpen('new')}
      sheet={
        open && (
          <AccountSheet
            account={open === 'new' ? null : open}
            onClose={() => setOpen(null)}
          />
        )
      }
    >
      <GroupGrid>
        {groups.map(({ type, rows }) => {
          const credit = type === CREDIT_CARD;
          const total = rows.reduce(
            (sum, a) => sum + Math.abs(a.balance_cents ?? 0),
            0,
          );
          return (
            <PanelGroup
              key={type}
              testID={`account-group-${type}`}
              label={credit ? 'Credit cards' : type}
              total={
                credit
                  ? `${MINUS}${formatMoney(total, { decimals: 2 })}`
                  : formatMoney(total)
              }
            >
              {rows.map(a => (
                <PanelRow
                  key={a.id}
                  testID={`account-row-${a.id}`}
                  icon={accountTypeIcons[type]}
                  name={a.name}
                  sub={a.note || a.type}
                  value={balanceText(a)}
                  note={
                    credit
                      ? 'liability'
                      : `${formatPercent(
                          data.assetsCents > 0
                            ? ((a.balance_cents ?? 0) / data.assetsCents) * 100
                            : 0,
                        )} of assets`
                  }
                  lit={desktop && hovered === a.id}
                  onPress={() => setOpen(a)}
                  onHoverIn={
                    desktop
                      ? () => setUi({ hoveredAccountId: a.id })
                      : undefined
                  }
                  onHoverOut={
                    desktop
                      ? () => setUi({ hoveredAccountId: null })
                      : undefined
                  }
                />
              ))}
            </PanelGroup>
          );
        })}
      </GroupGrid>
    </PanelFrame>
  );
}
