import { Platform } from 'react-native';

/** The smallest comfortable touch target, in pt (Apple's guideline). */
export const MIN_TOUCH = 44;

const grow = (size: number) => Math.max(0, Math.ceil((MIN_TOUCH - size) / 2));

/**
 * The `hitSlop` that grows a control drawn `height` tall (and `width` wide)
 * to a 44pt touch target on iOS, without changing how it looks. The Mac's
 * pointer needs none.
 */
export function touchSlop(height: number, width: number = MIN_TOUCH) {
  if (Platform.OS !== 'ios') {
    return undefined;
  }
  const v = grow(height);
  const h = grow(width);
  return { top: v, bottom: v, left: h, right: h };
}
