import { fireEvent, render, screen } from '@testing-library/react-native';
import { HoverSurface } from '@/components/ui/HoverSurface';
import { HoverSurface as MacHoverSurface } from '@/components/ui/HoverSurface.macos';
import { classes } from '../../../../test/classes';

describe('HoverSurface', () => {
  it('draws nothing on iOS, which has no pointer', async () => {
    await render(<HoverSurface testID="hover" onHover={jest.fn()} />);
    expect(screen.queryByTestId('hover')).toBeNull();
  });

  describe('on macOS', () => {
    it('is the native tracking view, filling its parent, never taking clicks', async () => {
      await render(<MacHoverSurface testID="hover" onHover={jest.fn()} />);
      const view = screen.getByTestId('hover');
      expect(view.type).toBe('FinnyHoverView');
      // RCTViewManager aborts setting pointerEvents on a non-React view.
      expect(view.props.pointerEvents).toBeUndefined();
      expect(classes(view)).toEqual(['absolute', 'inset-0']);
    });

    it('reports each move, then null when the pointer leaves', async () => {
      const onHover = jest.fn();
      await render(<MacHoverSurface testID="hover" onHover={onHover} />);
      const point = { x: 12, y: 40, width: 200, height: 100 };
      await fireEvent(screen.getByTestId('hover'), 'hoverMove', {
        nativeEvent: point,
      });
      await fireEvent(screen.getByTestId('hover'), 'hoverEnd');
      expect(onHover.mock.calls).toEqual([[point], [null]]);
    });
  });
});
