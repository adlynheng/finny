import { tokens } from '@/theme/tokens';
import { fanLayout, swipeTarget } from '../fanLayout';

const desktop = tokens.cardFan.desktop;
const lefts = (places: ReturnType<typeof fanLayout>) => places.map(p => p.left);

describe('fanLayout', () => {
  it('one card: centred in the span, in front and upright', () => {
    expect(fanLayout(1, 0, desktop)).toEqual([
      { left: 180, top: 0, rotateDeg: 0, scale: 1, z: 50, front: true },
    ]);
  });

  it('three cards: the design’s fan, the selected one in the middle slot', () => {
    // step min(180, 360/2) = 180 from 0; the first card selected.
    const places = fanLayout(3, 0, desktop);
    expect(lefts(places)).toEqual([180, 0, 360]);
    expect(places[0]).toMatchObject({ top: 0, rotateDeg: 0, scale: 1, z: 50 });
    expect(places[1]).toMatchObject({
      top: 26,
      rotateDeg: -6,
      scale: 0.92,
      z: 2,
    });
    expect(places[2]).toMatchObject({
      top: 26,
      rotateDeg: 6,
      scale: 0.92,
      z: 2,
    });
  });

  it('selecting another card moves it to the middle, keeping the rest in order', () => {
    const places = fanLayout(3, 2, desktop);
    expect(lefts(places)).toEqual([0, 360, 180]);
    expect(places.map(p => p.front)).toEqual([false, false, true]);
  });

  it('six cards: an even 72px step across the span, stacked by distance from the middle', () => {
    const places = fanLayout(6, 5, desktop);
    // The selected card takes slot 2, left of the middle.
    expect(lefts(places)).toEqual([0, 72, 216, 288, 360, 144]);
    expect(places.map(p => p.rotateDeg)).toEqual([-15, -9, 3, 9, 15, 0]);
    expect(places.map(p => p.z)).toEqual([4, 5, 6, 5, 4, 50]);
    expect(Math.max(...lefts(places))).toBe(desktop.span);
  });

  it('mobile: the step comes from its narrower spread', () => {
    const mobile = tokens.cardFan.mobile;
    // step min(56, 112/2) = 56, offset (128 − 112)/2 = 8.
    expect(lefts(fanLayout(3, 0, mobile))).toEqual([64, 8, 120]);
  });

  it('an unknown selection falls back to the first card', () => {
    expect(fanLayout(2, -1, desktop)[0]!.front).toBe(true);
  });
});

describe('swipeTarget', () => {
  // Three cards, the first in front: card 1 sits left of it, card 2 right.
  const places = fanLayout(3, 0, desktop);

  it('a swipe left brings the right-hand neighbour forward, a swipe right the left-hand one', () => {
    expect(swipeTarget(places, 1)).toBe(2);
    expect(swipeTarget(places, -1)).toBe(1);
  });

  it('nothing past either end', () => {
    // Two cards: the front one takes the left slot.
    expect(swipeTarget(fanLayout(2, 0, desktop), -1)).toBeNull();
    expect(swipeTarget(fanLayout(2, 0, desktop), 1)).toBe(1);
    expect(swipeTarget(fanLayout(1, 0, desktop), 1)).toBeNull();
  });
});
