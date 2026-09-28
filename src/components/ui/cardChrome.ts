import { Platform } from 'react-native';
import { tokens } from '@/theme/tokens';

/**
 * The chrome every card shares: 6px corners on desktop, 8px on mobile, 18px
 * padding. macOS renders the desktop design and iOS the mobile one.
 */
export const cardChrome = 'rounded-6 ios:rounded-8 p-card';

/** The same corner radius as a number, for fills drawn in SVG. */
export const cardRadius =
  Platform.OS === 'ios'
    ? tokens.card.radius.mobile
    : tokens.card.radius.desktop;

/** Joins class names, skipping empty ones. */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}
