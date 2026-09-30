import { Portal } from '@rn-primitives/portal';
import { useId } from 'react';
import { Platform, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './Button';
import { Glass } from './Glass';
import { SheetScrim } from './SheetParts';

type Props = {
  open: boolean;
  /** The thing being deleted, quoted in the title: `Delete “Japan trip”?` */
  name: string;
  /** What deleting it means, before `This can’t be undone.` */
  detail: string;
  /** The Delete button's label, e.g. `Delete goal`. */
  confirmLabel: string;
  onConfirm: () => void;
  /** Called by Cancel and the scrim. */
  onCancel: () => void;
  /** While the delete is in flight: Delete waits. */
  pending?: boolean;
};

/**
 * The confirmation before a delete. Desktop: a 400px modal over the blurred
 * canvas scrim, Cancel and a filled Delete at the bottom right. Mobile: a
 * white bottom sheet with the two stacked as 48px touch targets, Delete
 * first. Either is drawn over everything, a form's Sheet included, through
 * the app root's portal.
 */
export function ConfirmDialog({
  open,
  name,
  detail,
  confirmLabel,
  onConfirm,
  onCancel,
  pending = false,
}: Props) {
  const portal = useId();
  if (!open) {
    return null;
  }
  const mobile = Platform.OS === 'ios';
  const text = (
    <>
      <Text
        accessibilityRole="header"
        className="font-sans text-[22px] font-normal tracking-[-0.01em] text-ink ios:text-[20px]"
      >
        {`Delete “${name}”?`}
      </Text>
      <Text
        testID="confirm-detail"
        className="font-sans text-[13px] leading-[19px] text-muted"
      >
        {`${detail} This can’t be undone.`}
      </Text>
    </>
  );
  const confirm = (
    <Button
      testID="confirm-delete"
      variant="destructive"
      size={mobile ? 'touch' : 'md'}
      label={confirmLabel}
      onPress={onConfirm}
      disabled={pending}
      className={mobile ? 'self-stretch' : undefined}
    />
  );

  if (!mobile) {
    return (
      <Portal name={portal}>
        <View
          testID="confirm-overlay"
          className="absolute inset-0 items-center justify-center p-frame-x"
        >
          <SheetScrim recipe="modalScrim" onClose={onCancel} />
          <Glass
            testID="confirm-surface"
            recipe="modal"
            radius={14}
            fill="bg-white/[.92]"
            className="w-[400px] max-w-full gap-y-[14px] p-[24px]"
          >
            {text}
            <View className="mt-[6px] flex-row justify-end gap-x-[8px]">
              <Button variant="ghost" label="Cancel" onPress={onCancel} />
              {confirm}
            </View>
          </Glass>
        </View>
      </Portal>
    );
  }
  return (
    <Portal name={portal}>
      <View testID="confirm-overlay" className="absolute inset-0 justify-end">
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          className="absolute inset-0"
        >
          <SheetScrim recipe="sheetScrim" onClose={onCancel} />
        </Animated.View>
        <Animated.View
          entering={SlideInDown.duration(280)}
          exiting={SlideOutDown.duration(220)}
        >
          <View
            testID="confirm-surface"
            className="gap-y-[12px] rounded-t-[20px] bg-white px-[18px] pt-[22px]"
            style={{ boxShadow: '0 -20px 60px rgba(0,0,0,.12)' }}
          >
            {text}
            <View className="mt-[6px] gap-y-[8px]">
              {confirm}
              <Button
                variant="soft"
                size="touch"
                label="Cancel"
                onPress={onCancel}
                className="self-stretch"
              />
            </View>
            {/* With the gap, 28px under the buttons, or clear of the home indicator. */}
            <SafeAreaView edges={['bottom']} className="min-h-[16px]" />
          </View>
        </Animated.View>
      </View>
    </Portal>
  );
}
