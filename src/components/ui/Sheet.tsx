import { Portal } from '@rn-primitives/portal';
import { useId } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './Button';
import { Glass } from './Glass';
import { SheetBody, SheetHeader, SheetScrim } from './SheetParts';
import type { SheetProps } from './sheetTypes';

export type { SheetProps } from './sheetTypes';

/**
 * The mobile form container: a solid bottom sheet with a grab handle over a
 * darker scrim, at most 92% of the screen tall, drawn over everything through
 * the app root's portal. It lifts clear of the keyboard, and its actions are
 * 48px touch targets: a soft Cancel, and the primary at twice its width.
 *
 * `width` is the desktop modal's; the sheet is always full width.
 */
export function Sheet({ open, onClose, title, actions, children }: SheetProps) {
  const name = useId();
  if (!open) {
    return null;
  }
  return (
    <Portal name={name}>
      <KeyboardAvoidingView
        testID="sheet-overlay"
        behavior="padding"
        className="absolute inset-0 justify-end"
      >
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          className="absolute inset-0"
        >
          <SheetScrim recipe="sheetScrim" onClose={onClose} />
        </Animated.View>
        <Animated.View
          entering={SlideInDown.duration(280)}
          exiting={SlideOutDown.duration(220)}
          pointerEvents="box-none"
          className="flex-1 justify-end"
        >
          <Glass
            testID="sheet-surface"
            recipe="sheet"
            radius="sheet"
            className="max-h-sheet gap-sheet-gap px-sheet-pad pt-[10px]"
          >
            <View
              testID="sheet-handle"
              className="h-[4px] w-[36px] self-center rounded-full bg-sheet-handle"
            />
            <SheetHeader title={title} onClose={onClose} />
            <SheetBody gapClassName="gap-sheet-gap">{children}</SheetBody>
            {actions && (
              <View
                testID="sheet-footer"
                className="mt-[4px] flex-row gap-[8px]"
              >
                {actions.danger && (
                  <Button
                    variant="danger"
                    label={actions.danger.label}
                    onPress={actions.danger.onPress}
                    disabled={actions.danger.disabled}
                    size="touch"
                  />
                )}
                <Button
                  variant="soft"
                  size="touch"
                  label="Cancel"
                  onPress={onClose}
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  label={actions.primary.label}
                  onPress={actions.primary.onPress}
                  disabled={actions.primary.disabled}
                  size="touch"
                  className="flex-2"
                />
              </View>
            )}
            {/* Clears the home indicator; empty, it is as tall as the inset. */}
            <SafeAreaView edges={['bottom']} />
          </Glass>
        </Animated.View>
      </KeyboardAvoidingView>
    </Portal>
  );
}
