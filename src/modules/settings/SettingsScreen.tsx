import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { Glass } from '@/components/ui/Glass';
import { useCards } from '@/hooks/useCards';
import { ShareOfAssetsCard } from '@/modules/net-worth/ShareOfAssetsCard';
import { useUiStore } from '@/stores/uiStore';
import { AccountsPanel } from './AccountsPanel';
import { AddCardSheet } from './AddCardSheet';
import { CardDetail } from './CardDetail';
import { CardFan } from './CardFan';
import { CategoriesPanel } from './CategoriesPanel';
import { FixedPanel } from './FixedPanel';
import { ProfileHeader } from './ProfileHeader';
import { SettingsNav } from './SettingsNav';
import {
  panelHeads,
  useSettingsData,
  type SettingsData,
} from './useSettingsData';

/**
 * The Settings page (FinnySettings2). On desktop it is the design's grid,
 * 'hero hero hero' over 'nav panel share', columns 230px 1fr 360px and rows
 * 330px 1fr: the hero three columns of its own, the card fan's 680px between
 * the profile and the selected card's details.
 *
 * On iOS the pieces stack in one scrolling column (FinnySettingsMobile): the
 * profile, the fan, the card's details, the nav as a row of chips, the
 * selected panel, and the share of assets.
 */
export function SettingsScreen() {
  const cards = useCards().data;
  const data = useSettingsData();
  const selectedId = useUiStore(s => s.selectedCardId);
  const setUi = useUiStore(s => s.set);
  const [adding, setAdding] = useState(false);

  if (!cards || !data) {
    return null;
  }
  const select = (id: number) => setUi({ selectedCardId: id });
  const selected = cards.find(c => c.id === selectedId) ?? cards[0];
  const heads = panelHeads(data);

  const profile = (
    <ProfileHeader
      settings={data.settings}
      cardCount={cards.length}
      accountCount={data.accounts.length}
    />
  );
  const fan = (
    <CardFan
      cards={cards}
      selectedId={selected?.id ?? null}
      onSelect={select}
      holder={data.settings.name}
    />
  );
  const detail = <CardDetail card={selected} onAdd={() => setAdding(true)} />;
  const sheet = adding && (
    <AddCardSheet onClose={() => setAdding(false)} onAdded={select} />
  );

  if (Platform.OS !== 'macos') {
    return (
      <ScrollView
        testID="settings-column"
        contentContainerClassName="gap-y-[12px] px-mobile-x pb-mobile-bottom pt-mobile-top"
        showsVerticalScrollIndicator={false}
      >
        {profile}
        <View className="mt-[6px]">{fan}</View>
        <Glass
          recipe="chip"
          radius={8}
          fill="bg-white/55"
          className="gap-y-[12px] p-[14px]"
        >
          {detail}
        </Glass>
        <SettingsNav heads={heads} />
        <Panel data={data} heads={heads} />
        <ShareOfAssetsCard settings />
        {sheet}
      </ScrollView>
    );
  }
  return (
    <View testID="settings-grid" className="flex-1 gap-y-frame-gap">
      <View
        testID="settings-hero"
        className="h-[330px] flex-row items-center gap-x-[24px]"
      >
        <View className="min-w-0 flex-1 self-stretch">{profile}</View>
        <View className="w-[680px]">{fan}</View>
        {detail}
      </View>
      <View className="min-h-0 flex-1 flex-row gap-x-frame-gap">
        <View testID="settings-nav-cell" className="w-[230px]">
          <SettingsNav heads={heads} />
        </View>
        <View testID="settings-panel-cell" className="min-w-0 flex-1">
          <Panel data={data} heads={heads} />
        </View>
        <View testID="settings-share-cell" className="w-[360px]">
          <ShareOfAssetsCard settings />
        </View>
      </View>
      {sheet}
    </View>
  );
}

/** The panel the nav has selected. */
function Panel({
  data,
  heads,
}: {
  data: SettingsData;
  heads: ReturnType<typeof panelHeads>;
}) {
  const panel = useUiStore(s => s.settingsPanel);
  switch (panel) {
    case 'accounts':
      return <AccountsPanel data={data} head={heads.accounts} />;
    case 'expenditure':
      return (
        <CategoriesPanel kind="expense" data={data} head={heads.expenditure} />
      );
    case 'deposit':
      return (
        <CategoriesPanel kind="deposit" data={data} head={heads.deposit} />
      );
    case 'fixed':
      return <FixedPanel data={data} head={heads.fixed} />;
  }
}
