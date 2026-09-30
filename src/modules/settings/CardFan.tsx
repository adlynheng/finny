import { useEffect } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Platform, Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { GradientFill } from '@/components/ui/GradientFill';
import { gradients } from '@/theme/gradients';
import { tokens } from '@/theme/tokens';
import type { CardRow } from '@/types/domain';
import { CardFace, cardKind } from './CardFace';
import { fanLayout, swipeTarget, type FanPlace } from './fanLayout';

const fan = tokens.cardFan;
/** How far a swipe travels before it changes the card. */
const SWIPE_PX = 40;
const move = { duration: fan.moveMs, easing: Easing.bezier(...fan.easing) };
const fade = {
  duration: fan.shadowMs,
  easing: Easing.bezier(...fan.shadowEasing),
};
// The macOS pointer, as the design's `cursor:pointer`.
const POINTER = { cursor: 'pointer' } as object;

type Props = {
  cards: CardRow[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** The name on every card, from the settings row. */
  holder: string;
};

/**
 * The Settings hero's fanned card stack over its blurred glow. Pressing a
 * card brings it to the front; on mobile a sideways swipe brings forward the
 * next card in that direction. Position, tilt, scale and shadow all ease to
 * the new fan.
 */
export function CardFan({ cards, selectedId, onSelect, holder }: Props) {
  const mobile = Platform.OS === 'ios';
  const selected = Math.max(
    0,
    cards.findIndex(c => c.id === selectedId),
  );
  const places = fanLayout(
    cards.length,
    selected,
    mobile ? fan.mobile : fan.desktop,
  );
  // A mostly vertical drag is left to the page's scroll view.
  const swipe = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .runOnJS(true)
    .onEnd(e => {
      if (Math.abs(e.translationX) < SWIPE_PX) {
        return;
      }
      const target = swipeTarget(places, e.translationX < 0 ? 1 : -1);
      if (target !== null) {
        onSelect(cards[target]!.id);
      }
    })
    .withTestId('card-fan-swipe');
  const stack = (
    <View
      testID="card-fan"
      className="h-[236px] w-full ios:h-[178px] ios:w-[358px] ios:self-center"
    >
      <View
        pointerEvents="none"
        className="absolute bottom-[-6%] left-[10%] right-[10%] top-[10%] ios:left-[8%] ios:right-[8%]"
      >
        <GradientFill
          gradient={
            mobile ? gradients.cardFanGlowMobile : gradients.cardFanGlow
          }
        />
      </View>
      {cards.map((card, i) => (
        <FanCard
          key={card.id}
          card={card}
          place={places[i]!}
          holder={holder}
          onPress={() => onSelect(card.id)}
          mobile={mobile}
        />
      ))}
    </View>
  );
  return mobile ? (
    <GestureDetector gesture={swipe}>{stack}</GestureDetector>
  ) : (
    stack
  );
}

function FanCard({
  card,
  place,
  holder,
  onPress,
  mobile,
}: {
  card: CardRow;
  place: FanPlace;
  holder: string;
  onPress: () => void;
  mobile: boolean;
}) {
  const left = useSharedValue(place.left);
  const top = useSharedValue(place.top);
  const rotate = useSharedValue(place.rotateDeg);
  const scale = useSharedValue(place.scale);
  const front = useSharedValue(place.front ? 1 : 0);
  useEffect(() => {
    left.value = withTiming(place.left, move);
    top.value = withTiming(place.top, move);
    rotate.value = withTiming(place.rotateDeg, move);
    scale.value = withTiming(place.scale, move);
    front.value = withTiming(place.front ? 1 : 0, fade);
  }, [
    place.left,
    place.top,
    place.rotateDeg,
    place.scale,
    place.front,
    left,
    top,
    rotate,
    scale,
    front,
  ]);

  const at = useAnimatedStyle(() => ({
    left: left.value,
    top: top.value,
    transform: [{ rotate: `${rotate.value}deg` }, { scale: scale.value }],
  }));
  const frontShadow = useAnimatedStyle(() => ({ opacity: front.value }));
  const restShadow = useAnimatedStyle(() => ({ opacity: 1 - front.value }));
  const corners = 'rounded-12 ios:rounded-[11px]';

  return (
    <Animated.View
      testID={`fan-card-${card.id}`}
      className="absolute aspect-[1.586] w-[320px] ios:w-[230px]"
      // The stacking changes at once, as CSS z-index does.
      style={[{ zIndex: place.z }, at]}
    >
      {/* Two shadows, crossfaded: the front card's deeper one and the rest's. */}
      <Animated.View
        className={`absolute inset-0 bg-ink ${corners}`}
        style={[{ boxShadow: fan.shadow.rest }, restShadow]}
      />
      <Animated.View
        className={`absolute inset-0 bg-ink ${corners}`}
        style={[{ boxShadow: fan.shadow.front }, frontShadow]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${card.bank} ${cardKind(card)} •••• ${card.last4}`}
        accessibilityState={{ selected: place.front }}
        onPress={onPress}
        className="absolute inset-0"
        style={mobile ? undefined : POINTER}
      >
        <CardFace card={card} holder={holder} />
        {/* The design's inset hairline. */}
        <View
          pointerEvents="none"
          className={`absolute inset-0 border border-white/20 ${corners}`}
        />
      </Pressable>
    </Animated.View>
  );
}
