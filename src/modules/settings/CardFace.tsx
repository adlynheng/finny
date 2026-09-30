import { Platform, Text, View } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse, G, Rect } from 'react-native-svg';

import { cx } from '@/components/ui/cardChrome';
import { GradientFill } from '@/components/ui/GradientFill';
import { cardThemes, gradients } from '@/theme/gradients';
import { tokens } from '@/theme/tokens';
import { CARD_THEMES, isOneOf, type CardRow } from '@/types/domain';

const fan = tokens.cardFan;
const { contours } = fan;
const [VIEW_W, VIEW_H] = contours.viewBox;

/** A card's theme, falling back to the first for a missing or unknown one. */
export function cardTheme(card: Pick<CardRow, 'color_theme'>) {
  return cardThemes[
    isOneOf(CARD_THEMES, card.color_theme) ? card.color_theme : CARD_THEMES[0]!
  ];
}

/** "Credit" or "Debit". */
export const cardKind = (card: Pick<CardRow, 'card_type'>) =>
  card.card_type === 'credit' ? 'Credit' : 'Debit';

/**
 * A bank card's face (the design's card in the Settings hero): its theme's
 * gradient under a white sheen and corner contour rings, then three tiers —
 * bank and product with the network, the EMV chip, and the masked number
 * with the holder and Credit/Debit. Text takes the theme's ink, since three
 * themes are light. It fills its parent, which sets the size.
 */
export function CardFace({ card, holder }: { card: CardRow; holder: string }) {
  const theme = cardTheme(card);
  const size = Platform.OS === 'ios' ? fan.mobile : fan.desktop;
  // The clip's corners, in the contours' viewBox units.
  const clipRadius = (size.radius * VIEW_W) / size.cardWidth;
  const text = theme.ink === tokens.colors.white ? 'text-white' : 'text-ink';
  const soft = cx('font-sans opacity-[.88]', text);

  return (
    <View className="absolute inset-0">
      <GradientFill
        gradient={{
          kind: 'layers',
          layers: [theme.gradient, gradients.cardSheen],
        }}
        radius={size.radius}
      />
      <View pointerEvents="none" className="absolute inset-0">
        <Svg
          testID="card-contours"
          width="100%"
          height="100%"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
        >
          <Defs>
            <ClipPath id={`card-clip-${card.id}`}>
              <Rect
                width={VIEW_W}
                height={VIEW_H}
                rx={clipRadius}
                ry={clipRadius}
              />
            </ClipPath>
          </Defs>
          <G clipPath={`url(#card-clip-${card.id})`}>
            {contours.radii.map(([rx, ry]) => (
              <Ellipse
                key={rx}
                cx={contours.centre[0]}
                cy={contours.centre[1]}
                rx={rx}
                ry={ry}
                fill="none"
                stroke={theme.ink}
                strokeOpacity={contours.opacity}
                strokeWidth={contours.width}
              />
            ))}
          </G>
        </Svg>
      </View>
      <View className="h-full justify-between px-[18px] py-[16px] ios:px-[14px] ios:py-[12px]">
        <View className="flex-row items-start justify-between">
          <View className="gap-y-[2px] ios:gap-y-px">
            <Text
              className={cx(
                'font-sans text-[14px] font-medium ios:text-[12px]',
                text,
              )}
            >
              {card.bank}
            </Text>
            <Text className={cx(soft, 'text-[10px] ios:text-[9px]')}>
              {card.product_name}
            </Text>
          </View>
          {card.network && (
            // Urbanist ships no italic, so the design's synthesized one is a slant.
            <Text
              className={cx(
                'font-sans text-[15px] font-semibold tracking-[.02em] -skew-x-[12deg] ios:text-[12px]',
                text,
              )}
            >
              {card.network}
            </Text>
          )}
        </View>
        <Chip />
        <View className="flex-row items-end justify-between">
          <View className="gap-y-[3px] ios:gap-y-[2px]">
            <Text
              className={cx(
                'font-sans text-[15px] tabular-nums tracking-[.14em] ios:text-[12px]',
                text,
              )}
            >
              •••• {card.last4}
            </Text>
            <Text
              className={cx(
                soft,
                'text-[9px] uppercase tracking-[.1em] ios:text-[8px]',
              )}
            >
              {holder}
            </Text>
          </View>
          <Text className={cx(soft, 'text-[10px] ios:text-[9px]')}>
            {cardKind(card)}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** The EMV chip: a gold rounded rectangle with two rows and a column of contact lines. */
function Chip() {
  const radius =
    Platform.OS === 'ios' ? fan.chipRadius.mobile : fan.chipRadius.desktop;
  return (
    <View
      testID="card-chip"
      className="h-[25px] w-[34px] ios:h-[19px] ios:w-[26px]"
    >
      <GradientFill gradient={gradients.cardChip} radius={radius} />
      <View className="absolute inset-x-0 top-[8px] h-px bg-black/[.18] ios:top-[6px]" />
      <View className="absolute inset-x-0 top-[16px] h-px bg-black/[.18] ios:top-[12px]" />
      <View className="absolute inset-y-0 left-[12px] w-px bg-black/[.18] ios:left-[9px]" />
      {/* The design's inset hairline. */}
      <View className="absolute inset-0 rounded-5 border border-black/[.12] ios:rounded-4" />
    </View>
  );
}
