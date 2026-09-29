import { View, type ViewProps } from 'react-native';
import { gradients } from '@/theme/gradients';
import { cardChrome, cardRadius, cx } from './cardChrome';
import { GradientFill } from './GradientFill';

/** The card gradients; the hero glows are backgrounds, not cards. */
export type CardGradientName = Exclude<
  keyof typeof gradients,
  'heroGlow' | 'heroGlowDial' | 'pnlGlow' | 'pnlGlowMobile'
>;

type Props = Omit<ViewProps, 'style'> & {
  gradient: CardGradientName;
  className?: string;
};

/**
 * A card on one of the design's gradients, with the standard card chrome. Its
 * text is white in the design; React Native text does not inherit colour, so
 * the card's own text sets `text-white`.
 */
export function GradientCard({
  gradient,
  className,
  children,
  ...rest
}: Props) {
  return (
    <View {...rest} className={cx(cardChrome, className)}>
      <GradientFill gradient={gradients[gradient]} radius={cardRadius} />
      {children}
    </View>
  );
}
