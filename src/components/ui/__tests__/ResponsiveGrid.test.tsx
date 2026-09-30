import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ResponsiveGrid } from '@/components/ui/ResponsiveGrid';

const cells = (n: number) =>
  Array.from({ length: n }, (_, i) => <Text key={i}>{`cell ${i}`}</Text>);
const rowSizes = () =>
  screen.getAllByTestId('grid-row').map(r => r.children.length);

describe('ResponsiveGrid', () => {
  it('fits as many minimum-width columns as the measured width takes', async () => {
    await render(
      <ResponsiveGrid testID="grid" minColumnWidth={180} columnGap={8}>
        {cells(5)}
      </ResponsiveGrid>,
    );
    // Before layout: one column.
    expect(rowSizes()).toEqual([1, 1, 1, 1, 1]);
    // (560 + 8) / (180 + 8) = 3.02: three columns, the last row padded.
    await fireEvent(screen.getByTestId('grid'), 'layout', {
      nativeEvent: { layout: { width: 560, height: 0 } },
    });
    expect(rowSizes()).toEqual([3, 3]);
    expect(screen.getByText('cell 3')).toBeTruthy();
  });

  it('takes a fixed column count', async () => {
    await render(
      <ResponsiveGrid columns={2} columnGap={8}>
        {cells(3)}
      </ResponsiveGrid>,
    );
    expect(rowSizes()).toEqual([2, 2]);
  });
});
