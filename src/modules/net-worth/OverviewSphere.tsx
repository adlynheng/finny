import { useMemo } from 'react';

import { Sphere } from '@/components/charts/Sphere';
import type { SphereClass } from '@/components/charts/sphereLayout';
import { useAccounts } from '@/hooks/useAccounts';
import { useAssetClasses } from '@/hooks/useAssetClasses';
import { useSnapshots } from '@/hooks/useSnapshots';
import { useUiStore } from '@/stores/uiStore';
import { assetClassSplit, netWorth } from '@/utils/derive/networth';
import { monthKey } from '@/utils/format/date';

/**
 * The hero's sphere: assets by class, round the ring in the classes' own order
 * (Cash, CPF, Investments, Property, as the design), with the oldest snapshot
 * in the window as its dashed reference. The highlighted class is the UI
 * store's `hoveredAssetClassId`, which the Share of assets card sets too.
 */
export function OverviewSphere() {
  const accounts = useAccounts().data;
  const classes = useAssetClasses().data;
  // The history card's default window, so the two share a cache entry.
  const oldest = useSnapshots(24).data?.[0];
  const selected = useUiStore(s => s.hoveredAssetClassId);
  const setUi = useUiStore(s => s.set);

  const sphereClasses = useMemo((): SphereClass[] => {
    if (!accounts || !classes) return [];
    const rank = (id: number) => {
      const i = classes.findIndex(c => c.id === id);
      return i === -1 ? classes.length : i;
    };
    return assetClassSplit(accounts, classes)
      .sort((a, b) => rank(a.id) - rank(b.id))
      .map(c => ({ key: String(c.id), label: c.label, cents: c.cents }));
  }, [accounts, classes]);

  if (!accounts || sphereClasses.length === 0) {
    return null;
  }
  return (
    <Sphere
      testID="overview-sphere-chart"
      classes={sphereClasses}
      oldest={
        oldest ? { month: monthKey(oldest.date), cents: oldest.total_cents } : null
      }
      newestCents={netWorth(accounts).netCents}
      selected={selected === null ? null : String(selected)}
      onSelect={key =>
        setUi({
          hoveredAssetClassId: key === null ? null : Number(key),
          hoveredAccountId: null,
        })
      }
    />
  );
}
