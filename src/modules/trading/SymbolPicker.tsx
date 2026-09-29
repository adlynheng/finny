import { Portal } from '@rn-primitives/portal';
import { useId, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Glass } from '@/components/ui/Glass';
import { cx } from '@/components/ui/cardChrome';
import { tokens } from '@/theme/tokens';
import type { Holding } from '@/utils/derive/portfolio';
import { formatPercent } from '@/utils/format/money';

type Placement = { top: number; left: number; width?: number };

/** Between the button and the list. */
const OFFSET = 6;
const LIST_SHADOW = {
  macos: '0 18px 44px rgba(0,0,0,.14)',
  ios: '0 18px 44px rgba(0,0,0,.16)',
};

/**
 * Position mode's symbol dropdown: a glass button showing the charted holding
 * and its name, opening a list of every holding with its share of the
 * portfolio. The list draws over the whole window through the app's portal,
 * behind it an invisible layer that closes it on any press outside. On mobile
 * the button spans the page and the list matches its width.
 */
export function SymbolPicker({
  holdings,
  symbol,
  onPick,
}: {
  holdings: readonly Holding[];
  symbol: string;
  onPick: (symbol: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const anchor = useRef<View>(null);
  const overlay = useRef<View>(null);
  const portal = `symbol-picker-${useId()}`;
  const mobile = Platform.OS === 'ios';
  const current = holdings.find(h => h.symbol === symbol);

  const close = () => {
    setOpen(false);
    setPlacement(null);
  };
  // Both frames in window coordinates, once the overlay has laid out.
  const place = () =>
    anchor.current?.measureInWindow((x, y, width, height) =>
      overlay.current?.measureInWindow((ox, oy) =>
        setPlacement({
          top: y - oy + height + OFFSET,
          left: x - ox,
          ...(mobile ? { width } : null),
        }),
      ),
    );

  return (
    <>
      <Pressable
        ref={anchor}
        testID="symbol-picker"
        accessibilityRole="button"
        accessibilityLabel={`Charting ${symbol}. Choose a holding`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        className="group ios:self-stretch"
      >
        <Glass
          recipe="chip"
          radius={mobile ? 10 : 6}
          fill="bg-white/60 group-hover:bg-white"
          className="h-[30px] flex-row items-center gap-x-[8px] px-[10px] ios:h-[42px] ios:px-[12px]"
        >
          <Text className="font-sans text-[12px] font-medium text-ink ios:text-[13px]">
            {symbol}
          </Text>
          <Text
            numberOfLines={1}
            className="max-w-[150px] font-sans text-[12px] text-muted ios:max-w-none ios:flex-1 ios:text-[13px]"
          >
            {current?.instrument.name ?? ''}
          </Text>
          <Svg
            width={mobile ? 10 : 9}
            height={mobile ? 10 : 9}
            viewBox="0 0 10 10"
          >
            <Path
              d="M2 3.5l3 3 3-3"
              stroke={tokens.colors.ink}
              strokeWidth={1.2}
              fill="none"
            />
          </Svg>
        </Glass>
      </Pressable>
      {open && (
        <Portal name={portal}>
          <View
            ref={overlay}
            testID="symbol-picker-overlay"
            onLayout={place}
            className="absolute inset-0"
          >
            <Pressable
              testID="symbol-picker-dismiss"
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={close}
              className="absolute inset-0"
            />
            <View
              testID="symbol-picker-list"
              // Measured, so not a class. Hidden until placed.
              style={[
                placement ?? undefined,
                { boxShadow: mobile ? LIST_SHADOW.ios : LIST_SHADOW.macos },
              ]}
              className={cx(
                'absolute w-[290px] gap-y-[2px] rounded-10 border border-white bg-white/[.96] p-[6px] ios:rounded-12 ios:bg-white/[.97]',
                !placement && 'opacity-0',
              )}
            >
              {holdings.map(h => (
                <Pressable
                  key={h.symbol}
                  testID={`symbol-option-${h.symbol}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: h.symbol === symbol }}
                  onPress={() => {
                    close();
                    onPick(h.symbol);
                  }}
                  className={cx(
                    'flex-row items-center gap-x-[10px] rounded-6 px-[10px] py-[8px] hover:bg-ink/5 ios:min-h-[42px] ios:rounded-8 ios:py-0',
                    h.symbol === symbol && 'bg-ink/5',
                  )}
                >
                  <Text className="w-[44px] font-sans text-[13px] text-ink ios:w-[48px] ios:text-[14px]">
                    {h.symbol}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="min-w-0 flex-1 font-sans text-[12px] text-muted"
                  >
                    {h.instrument.name}
                  </Text>
                  <Text className="font-sans text-[11px] tabular-nums text-muted">
                    {formatPercent(h.weight * 100, 0)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Portal>
      )}
    </>
  );
}
