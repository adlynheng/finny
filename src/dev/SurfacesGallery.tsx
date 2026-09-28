/**
 * Temporary: Task 31's surfaces on one screen, so they can be checked by eye on
 * macOS and iOS. Mounted from App.tsx until the pages exist (Phase H); delete
 * it then.
 */

import { ScrollView, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Glass } from '@/components/ui/Glass';
import {
  GradientCard,
  type CardGradientName,
} from '@/components/ui/GradientCard';
import { GradientFill } from '@/components/ui/GradientFill';
import { gradients } from '@/theme/gradients';
import { tokens, type GlassName } from '@/theme/tokens';
import { ControlsGallery } from './ControlsGallery';
import { IconsGallery } from './IconsGallery';
import { SheetGallery } from './SheetGallery';
import { TablesGallery } from './TablesGallery';

const cards: CardGradientName[] = [
  'netWorthHistory',
  'thisMonth',
  'shareOfAssets',
  'goals',
  'commitments',
  'portfolioHealth',
];

const onCanvas: GlassName[] = [
  'chip',
  'navPill',
  'card',
  'modal',
  'modalScrim',
  'sheet',
  'sheetScrim',
  'popover',
];

function Label({ children }: { children: string }) {
  return (
    <Text className="font-sans text-[12px] font-medium text-muted">
      {children}
    </Text>
  );
}

/** Busy content to sit behind a glass tile, so the blur (or its absence) shows. */
function Backdrop() {
  return (
    <View className="absolute inset-0 justify-center gap-y-1 px-1">
      <View className="h-3 w-3/4 rounded-4 bg-lime" />
      <Text className="font-sans text-[12px] text-ink">S$248,310 · fox</Text>
      <View className="h-3 w-1/2 rounded-4 bg-danger" />
    </View>
  );
}

const tile = 'absolute bottom-1 left-5 right-1 top-5 justify-end p-2';

export function SurfacesGallery() {
  return (
    <ScrollView contentContainerClassName="gap-y-4 pb-4">
      <Label>Icons (Task 36)</Label>
      <IconsGallery />

      <Label>Tables (Task 35)</Label>
      <TablesGallery />

      <Label>Sheet (Task 33)</Label>
      <SheetGallery />

      <Label>Controls (Task 32)</Label>
      <ControlsGallery />

      <Label>Gradient cards, then heroGlow and heroGlowDial</Label>
      <View className="flex-row flex-wrap gap-frame-gap">
        {cards.map(name => (
          <GradientCard key={name} gradient={name} className="h-16 w-24 p-3">
            <Text className="font-sans text-[11px] font-medium text-white">
              {name}
            </Text>
          </GradientCard>
        ))}
        <View className="h-16 w-24 rounded-6 border border-canvas-alt">
          <GradientFill gradient={gradients.heroGlow} />
        </View>
        <View className="h-16 w-24 rounded-6 border border-canvas-alt">
          <GradientFill gradient={gradients.heroGlowDial} />
        </View>
      </View>

      <Label>Glass recipes over content (onGradient on a gradient)</Label>
      <View className="flex-row flex-wrap gap-frame-gap">
        {onCanvas.map(recipe => (
          <View key={recipe} className="h-20 w-24">
            <Backdrop />
            <Glass recipe={recipe} radius={8} className={tile}>
              <Text className="font-sans text-[11px] font-medium text-ink">
                {recipe}
                {tokens.glass[recipe].blur
                  ? ` · ${tokens.glass[recipe].blur}`
                  : ''}
              </Text>
            </Glass>
          </View>
        ))}
        <GradientCard gradient="portfolioHealth" className="h-20 w-24 p-0">
          <Glass recipe="onGradient" radius={8} className={tile}>
            <Text className="font-sans text-[11px] font-medium text-white">
              onGradient · 12
            </Text>
          </Glass>
        </GradientCard>
      </View>

      <Label>
        Card, and the overflow-hidden probe (“top” above “bottom”, both low)
      </Label>
      <View className="flex-row gap-frame-gap">
        <Card className="w-52 gap-y-1">
          <Text className="font-sans text-[13px] font-medium text-ink">
            Transactions
          </Text>
          <Text className="font-sans text-[11px] text-muted">
            The plain glass card, 18px padding
          </Text>
        </Card>
        <View className="h-16 w-24 justify-end overflow-hidden rounded-6 bg-ink p-3">
          <Text className="font-sans text-[12px] text-white">top</Text>
          <Text className="font-sans text-[12px] text-lime">bottom</Text>
        </View>
      </View>
    </ScrollView>
  );
}
