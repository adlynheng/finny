import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { ScrubSurface } from '@/components/ui/ScrubSurface';

const draw = async (onHover = jest.fn()) => {
  await render(<ScrubSurface testID="scrub" onHover={onHover} />);
  await fireEvent(screen.getByTestId('scrub'), 'layout', {
    nativeEvent: { layout: { x: 5, y: 7, width: 300, height: 120 } },
  });
  return onHover;
};

describe('ScrubSurface (iOS)', () => {
  it('reports the finger as it drags sideways, with the surface’s size', async () => {
    const onHover = await draw();
    await act(() =>
      fireGestureHandler(getByGestureTestId('scrub-drag'), [
        { state: State.BEGAN, x: 10, y: 20 },
        { state: State.ACTIVE, x: 40, y: 20 },
        { x: 90, y: 22 },
        { state: State.END, x: 90, y: 22 },
      ]),
    );
    expect(onHover.mock.calls).toEqual([
      [{ x: 40, y: 20, width: 300, height: 120 }],
      [{ x: 90, y: 22, width: 300, height: 120 }],
    ]);
  });

  it('reports a tap where it lands', async () => {
    const onHover = await draw();
    await act(() =>
      fireGestureHandler(getByGestureTestId('scrub-tap'), [
        { state: State.BEGAN, x: 150, y: 60 },
        { state: State.ACTIVE, x: 150, y: 60 },
        { state: State.END, x: 150, y: 60 },
      ]),
    );
    expect(onHover).toHaveBeenCalledWith({
      x: 150,
      y: 60,
      width: 300,
      height: 120,
    });
  });

  it('never reports the finger leaving: lifting it keeps the point', async () => {
    const onHover = await draw();
    await act(() =>
      fireGestureHandler(getByGestureTestId('scrub-drag'), [
        { state: State.BEGAN, x: 10, y: 20 },
        { state: State.ACTIVE, x: 40, y: 20 },
        { state: State.END, x: 40, y: 20 },
      ]),
    );
    expect(onHover).not.toHaveBeenCalledWith(null);
  });
});
