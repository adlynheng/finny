import type { ReactNode } from 'react';
import type { DialogWidth } from '@/theme/tokens';

export type SheetAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

/**
 * The one API both form containers take: Sheet.macos.tsx draws a centred
 * modal, Sheet.tsx a bottom sheet. A form passes the same props to either and
 * never checks the platform.
 */
export type SheetProps = {
  open: boolean;
  /** Called by the scrim, the close button and Cancel. */
  onClose: () => void;
  title: string;
  /** A muted line under the title, e.g. the Sell form's `NVIDIA · you hold 25 shares`. */
  subtitle?: string;
  /**
   * The desktop modal's width: standard (520, the transaction and goal forms),
   * narrow (500, recurring-charge and sell) or wide (540, new position). The
   * mobile sheet is always full width.
   */
  width?: DialogWidth;
  /** The footer: Cancel (which closes) beside these. No footer without them. */
  actions?: {
    primary: SheetAction;
    /** A Delete, when editing. */
    danger?: SheetAction;
  };
  /**
   * A live line about the form, e.g. the recurring charge's `≈ S$X per month`:
   * at the footer's left on desktop, where Delete then joins Cancel and the
   * primary on the right; under the form on mobile.
   */
  note?: ReactNode;
  /** The form. It scrolls when taller than the window; header and footer stay. */
  children: ReactNode;
};
