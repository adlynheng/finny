import { render, screen } from '@testing-library/react-native';
import { processColor } from 'react-native';
import { Icon } from '@/components/icons/Icon';
import { expenseIcons } from '@/components/icons/registry';
import { tokens } from '@/theme/tokens';

type Node = { type: string; props: Record<string, unknown>; children: Node[] };

const pathOf = (svg: Node): Node =>
  svg.type === 'RNSVGPath'
    ? svg
    : (svg.children.map(pathOf).find(Boolean) as Node);

describe('Icon', () => {
  it('draws the path on a 16×16 grid, 16pt by default', async () => {
    await render(<Icon testID="icon" path={expenseIcons.Food} />);
    const svg = screen.getByTestId('icon');
    expect(svg.props).toMatchObject({ vbWidth: 16, vbHeight: 16 });
    expect(svg.props).toMatchObject({ width: 16, height: 16 });
  });

  it('strokes in ink at 1.1 with round ends, never filled', async () => {
    await render(<Icon testID="icon" path={expenseIcons.Food} />);
    const path = pathOf(screen.getByTestId('icon') as unknown as Node);
    expect(path.props.d).toBe(expenseIcons.Food);
    expect(path.props).toMatchObject({
      strokeWidth: 1.1,
      strokeLinecap: 1,
      strokeLinejoin: 1,
    });
    expect(path.props.fill).toBeNull();
    expect(path.props.stroke).toMatchObject({
      payload: processColor(tokens.colors.ink),
    });
  });

  it('takes a size, colour and stroke width', async () => {
    await render(
      <Icon
        testID="icon"
        path={expenseIcons.Food}
        size={19}
        color={tokens.colors.lime}
        strokeWidth={1.2}
      />,
    );
    const svg = screen.getByTestId('icon');
    expect(svg.props).toMatchObject({ width: 19, height: 19 });
    expect(pathOf(svg as unknown as Node).props.strokeWidth).toBe(1.2);
  });
});
