import { Portal } from '@rn-primitives/portal';
import { useId } from 'react';
import { View } from 'react-native';
import type { DialogWidth } from '@/theme/tokens';
import { Button } from './Button';
import { cx } from './cardChrome';
import { Glass } from './Glass';
import { SheetBody, SheetHeader, SheetNote, SheetScrim } from './SheetParts';
import type { SheetProps } from './sheetTypes';

export type { SheetProps } from './sheetTypes';

const widthClass: Record<DialogWidth, string> = {
  standard: 'w-dialog-standard',
  narrow: 'w-dialog-narrow',
  wide: 'w-dialog-wide',
};

/**
 * The desktop form container: a centred modal of `modal` glass over a blurred
 * canvas scrim, drawn over the whole window through the app root's portal.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  width = 'standard',
  actions,
  note,
  children,
}: SheetProps) {
  const name = useId();
  const danger = actions?.danger && (
    <Button
      testID="sheet-danger"
      variant="danger"
      label={actions.danger.label}
      onPress={actions.danger.onPress}
      disabled={actions.danger.disabled}
    />
  );
  if (!open) {
    return null;
  }
  return (
    <Portal name={name}>
      <View
        testID="sheet-overlay"
        className="absolute inset-0 items-center justify-center p-frame-x"
      >
        <SheetScrim recipe="modalScrim" onClose={onClose} />
        <Glass
          testID="sheet-surface"
          recipe="modal"
          radius={14}
          className={cx(
            'max-h-full max-w-full gap-dialog-gap p-dialog-pad',
            widthClass[width],
          )}
        >
          <SheetHeader title={title} subtitle={subtitle} onClose={onClose} />
          <SheetBody gapClassName="gap-dialog-gap">{children}</SheetBody>
          {actions && (
            <View
              testID="sheet-footer"
              className="mt-[4px] flex-row items-center gap-[8px]"
            >
              {note !== undefined && <SheetNote note={note} />}
              {note === undefined && danger}
              <View testID="sheet-footer-spacer" className="flex-1" />
              {note !== undefined && danger}
              <Button variant="ghost" label="Cancel" onPress={onClose} />
              <Button
                variant="primary"
                label={actions.primary.label}
                onPress={actions.primary.onPress}
                disabled={actions.primary.disabled}
              />
            </View>
          )}
        </Glass>
      </View>
    </Portal>
  );
}
