import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

/**
 * A form's small muted label over its control, for controls that carry no
 * label of their own: chip rows and segmented switches. (Input and the date
 * field draw theirs.)
 */
export function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-[8px]">
      <Text className="font-sans text-[12px] text-muted">{label}</Text>
      {children}
    </View>
  );
}
