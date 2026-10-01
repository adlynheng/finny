import { Portal } from '@rn-primitives/portal';
import { useEffect, useId, useMemo } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './Button';
import { Glass } from './Glass';
import { SheetBody, SheetHeader, SheetNote, SheetScrim } from './SheetParts';
import type { SheetProps } from './sheetTypes';

export type { SheetProps } from './sheetTypes';

/**
 * The mobile form container: a solid bottom sheet with a grab handle over a
 * darker scrim, at most 92% of the screen tall, drawn over everything through
 * the app root's portal. It lifts clear of the keyboard, and its actions are
 * 48px touch targets: a soft Cancel, and the primary at twice its width.
 * Dragging its handle or title down moves it with the finger; let go past
 * 120pt, or flick it, and it closes, otherwise it springs back. The form
 * below keeps its own scroll.
 *
 * `width` is the desktop modal's; the sheet is always full width.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  actions,
  note,
  children,
}: SheetProps) {
  const name = useId();
  const drag = useSheetDrag(open, onClose);
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
          {/* Full height, so the sheet's 92% cap resolves against the screen
              and the sheet sits on the bottom edge. */}
          <Animated.View
            testID="sheet-drag-frame"
            style={drag.style}
            pointerEvents="box-none"
            className="flex-1 justify-end"
          >
            <Glass
              testID="sheet-surface"
              recipe="sheet"
              radius="sheet"
              className="max-h-sheet gap-sheet-gap px-sheet-pad pt-[10px]"
            >
              <GestureDetector gesture={drag.gesture}>
                <View testID="sheet-drag-zone" className="gap-sheet-gap">
                  <View
                    testID="sheet-handle"
                    className="h-[4px] w-[36px] self-center rounded-full bg-sheet-handle"
                  />
                  <SheetHeader
                    title={title}
                    subtitle={subtitle}
                    onClose={onClose}
                  />
                </View>
              </GestureDetector>
              <SheetBody gapClassName="gap-sheet-gap">
                {children}
                {note !== undefined && <SheetNote note={note} />}
              </SheetBody>
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
        </Animated.View>
      </KeyboardAvoidingView>
    </Portal>
  );
}

/** A drag this far down closes the sheet when let go (pt). */
const CLOSE_DISTANCE = 120;
/** A flick down this fast closes it however far it went (pt/s). */
const CLOSE_VELOCITY = 800;

/**
 * The handle's drag: the sheet follows the finger down (never up), and
 * closes or springs back when let go. Mostly sideways drags are left alone.
 */
function useSheetDrag(open: boolean, onClose: () => void) {
  const offset = useSharedValue(0);
  // A sheet dragged shut opens again where it belongs.
  useEffect(() => {
    if (open) {
      offset.value = 0;
    }
  }, [open, offset]);
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-20, 20])
        .runOnJS(true)
        .onUpdate(e => {
          offset.value = Math.max(0, e.translationY);
        })
        .onEnd(e => {
          if (e.translationY > CLOSE_DISTANCE || e.velocityY > CLOSE_VELOCITY) {
            onClose();
          } else {
            offset.value = withSpring(0, { damping: 20, stiffness: 240 });
          }
        })
        .withTestId('sheet-drag'),
    [offset, onClose],
  );
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));
  return { gesture, style };
}
