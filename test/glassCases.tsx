/**
 * The behaviour both Glass implementations share, run against each by
 * Glass.test.tsx (iOS) and Glass.macos.test.tsx, in src/components/ui/__tests__. Only the blur view differs.
 */

import { render, screen } from '@testing-library/react-native';
import type { ComponentType } from 'react';
import { Text } from 'react-native';
import type { GlassProps } from '@/components/ui/Glass';
import { tokens, type GlassName } from '@/theme/tokens';
import { classes } from './classes';

type Host = { props: Record<string, any>; children: unknown[] };

// The class names each recipe draws with: the fill, then the border.
export const expected: Record<GlassName, { fill: string; border: string[] }> = {
  bottomBar: {
    fill: 'bg-glass-bottom-bar',
    border: ['border', 'border-glass-bottom-bar-border'],
  },
  chip: {
    fill: 'bg-glass-chip',
    border: ['border', 'border-glass-chip-border'],
  },
  navPill: {
    fill: 'bg-glass-nav-pill',
    border: ['border', 'border-glass-nav-pill-border'],
  },
  card: {
    fill: 'bg-glass-card',
    border: ['border', 'border-glass-card-border'],
  },
  onGradient: {
    fill: 'bg-glass-on-gradient',
    border: ['border', 'border-glass-on-gradient-border'],
  },
  modal: {
    fill: 'bg-glass-modal',
    border: ['border', 'border-glass-modal-border'],
  },
  modalScrim: { fill: 'bg-glass-modal-scrim', border: [] },
  sheet: { fill: 'bg-glass-sheet', border: [] },
  sheetScrim: { fill: 'bg-glass-sheet-scrim', border: [] },
  popover: {
    fill: 'bg-glass-popover',
    border: ['border', 'border-glass-popover-border'],
  },
  tooltip: {
    fill: 'bg-glass-tooltip',
    border: ['border', 'border-glass-tooltip-border'],
  },
};

export const recipes = Object.keys(tokens.glass) as GlassName[];
export const blurred = recipes.filter(r => tokens.glass[r].blur !== null);
export const unblurred = recipes.filter(r => tokens.glass[r].blur === null);

export function describeGlass(Glass: ComponentType<GlassProps>) {
  it('renders its children', async () => {
    await render(
      <Glass recipe="card">
        <Text>Transactions</Text>
      </Glass>,
    );
    expect(screen.getByText('Transactions')).toBeTruthy();
  });

  it.each(blurred)(
    '%s: tints over its blur, if the platform blurs it, in a clipped layer behind the content',
    async recipe => {
      await render(
        <Glass recipe={recipe} testID="glass">
          <Text>Content</Text>
        </Glass>,
      );
      const glass = screen.getByTestId('glass') as unknown as Host;
      const clip = screen.getByTestId('glass-clip') as unknown as Host;
      const fill = screen.getByTestId('glass-fill');

      // Paint order: the clipped blur (where the platform blurs this recipe;
      // each platform's own tests say which) and tint, then the content.
      expect(glass.children[0]).toBe(clip);
      expect([['glass-blur', 'glass-fill'], ['glass-fill']]).toContainEqual(
        (clip.children as Host[]).map(layer => layer.props.testID),
      );
      expect(classes(clip)).toEqual(
        expect.arrayContaining(['absolute', 'inset-0', 'overflow-hidden']),
      );
      expect(clip.props.pointerEvents).toBe('none');
      expect(classes(fill)).toEqual(
        expect.arrayContaining(['absolute', 'inset-0', expected[recipe].fill]),
      );
      expect(classes(glass)).not.toContain(expected[recipe].fill);
    },
  );

  it.each(unblurred)(
    '%s: has no blur, so fills itself with no extra layers',
    async recipe => {
      await render(<Glass recipe={recipe} testID="glass" />);
      expect(screen.queryByTestId('glass-clip')).toBeNull();
      expect(screen.queryByTestId('glass-blur')).toBeNull();
      expect(classes(screen.getByTestId('glass'))).toContain(
        expected[recipe].fill,
      );
    },
  );

  it.each(recipes)(
    '%s: never clips the view that casts the shadow',
    async recipe => {
      // react-native-macos crashes mounting children into a view that has both
      // overflow: hidden and a box shadow, so the outer view must not clip.
      await render(<Glass recipe={recipe} testID="glass" />);
      expect(classes(screen.getByTestId('glass'))).not.toContain(
        'overflow-hidden',
      );
    },
  );

  it.each(recipes)(
    '%s: draws its hairline border on the outer view, if it has one',
    async recipe => {
      await render(<Glass recipe={recipe} testID="glass" />);
      const glass = classes(screen.getByTestId('glass'));
      if (expected[recipe].border.length === 0) {
        expect(glass.filter(c => c.startsWith('border'))).toEqual([]);
      } else {
        expect(glass).toEqual(expect.arrayContaining(expected[recipe].border));
      }
    },
  );

  it.each(recipes)(
    '%s: casts the recipe shadow, if it has one',
    async recipe => {
      await render(<Glass recipe={recipe} testID="glass" />);
      const { style } = screen.getByTestId('glass').props;
      const shadow = tokens.glass[recipe].shadow;
      if (shadow === null) {
        expect(style?.boxShadow).toBeUndefined();
      } else {
        expect(style).toEqual({ boxShadow: shadow });
      }
    },
  );

  it('rounds the outer view and the clipped layer alike', async () => {
    await render(<Glass recipe="card" radius="card" testID="glass" />);
    const card = ['rounded-6', 'ios:rounded-8'];
    expect(classes(screen.getByTestId('glass'))).toEqual(
      expect.arrayContaining(card),
    );
    expect(classes(screen.getByTestId('glass-clip'))).toEqual(
      expect.arrayContaining(card),
    );
  });

  it('takes a radius from the scale', async () => {
    await render(<Glass recipe="chip" radius={7} testID="glass" />);
    expect(classes(screen.getByTestId('glass'))).toContain('rounded-7');
    expect(classes(screen.getByTestId('glass-clip'))).toContain('rounded-7');
  });

  it('is square with no radius', async () => {
    await render(<Glass recipe="sheetScrim" testID="glass" />);
    const rounded = (id: string) =>
      classes(screen.getByTestId(id)).filter(c => c.includes('rounded'));
    expect(rounded('glass')).toEqual([]);
    expect(rounded('glass-clip')).toEqual([]);
  });

  it('adds the caller’s classes and view props to the outer view', async () => {
    const onLayout = jest.fn();
    await render(
      <Glass
        recipe="chip"
        testID="glass"
        className="px-3"
        pointerEvents="box-none"
        onLayout={onLayout}
      />,
    );
    const glass = screen.getByTestId('glass');
    expect(classes(glass)).toEqual(expect.arrayContaining(['px-3', 'border']));
    expect(glass.props.pointerEvents).toBe('box-none');
    expect(glass.props.onLayout).toBe(onLayout);
  });
}
