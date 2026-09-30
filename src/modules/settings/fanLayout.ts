import { tokens } from '@/theme/tokens';

const { dropPx, tiltDeg, restScale, frontZ } = tokens.cardFan;

export type FanSpec = { span: number; spread: number; maxStep: number };

export type FanPlace = {
  left: number;
  top: number;
  rotateDeg: number;
  scale: number;
  z: number;
  front: boolean;
};

/**
 * Where each of `count` cards sits in the fan (the design's `renderVals`), in
 * the cards' own order. The selected card takes the middle slot (left of it,
 * with an even count), in front, upright and full size; the others keep their
 * order around it, dropped, tilted by their distance from the middle, scaled
 * down, and stacked with the middle ones on top.
 */
export function fanLayout(
  count: number,
  selected: number,
  { span, spread, maxStep }: FanSpec,
): FanPlace[] {
  const step = count > 1 ? Math.min(maxStep, spread / (count - 1)) : 0;
  const offset = (span - step * (count - 1)) / 2;
  const mid = (count - 1) / 2;
  const sel = Math.min(Math.max(selected, 0), count - 1);
  const rest = [...Array(count).keys()].filter(i => i !== sel);
  const centre = Math.floor(mid);
  const order = [...rest.slice(0, centre), sel, ...rest.slice(centre)];

  return [...Array(count).keys()].map(card => {
    const slot = order.indexOf(card);
    const front = card === sel;
    return {
      left: offset + slot * step,
      top: front ? 0 : dropPx,
      rotateDeg: front ? 0 : (slot - mid) * tiltDeg,
      scale: front ? 1 : restScale,
      z: front ? frontZ : Math.round(count - Math.abs(slot - mid)),
      front,
    };
  });
}

/**
 * The card a swipe brings forward: the front card's neighbour on the right
 * for a swipe to the left (`1`), on the left for a swipe to the right (`−1`).
 * Null at either end.
 */
export function swipeTarget(places: FanPlace[], direction: 1 | -1) {
  const front = places.find(p => p.front);
  if (!front) {
    return null;
  }
  let best: number | null = null;
  places.forEach((p, i) => {
    const ahead = (p.left - front.left) * direction;
    if (
      ahead > 0 &&
      (best === null || ahead < (places[best]!.left - front.left) * direction)
    ) {
      best = i;
    }
  });
  return best;
}
