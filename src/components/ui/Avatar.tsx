import { Text, View } from 'react-native';

/** Up to two initials: "Wei Ling Tan" is WL, "Adlyn" is A. */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase() ?? '')
    .join('');
}

const SIZES = {
  /** The Settings profile's tile. */
  lg: {
    tile: 'size-[52px] rounded-8 ios:size-[48px]',
    text: 'text-[17px] ios:text-[16px]',
  },
  /** The desktop header's, the size of the chip it replaced. */
  sm: { tile: 'size-[34px] rounded-6', text: 'text-[12px]' },
} as const;

/** The user's initials in lime on an ink tile. */
export function Avatar({
  name,
  size,
  className = '',
}: {
  name: string;
  size: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <View
      className={`items-center justify-center bg-ink ${s.tile} ${className}`}
    >
      <Text
        testID="avatar-initials"
        className={`font-sans font-medium text-lime ${s.text}`}
      >
        {initialsOf(name)}
      </Text>
    </View>
  );
}
