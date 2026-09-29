import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { Text } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import {
  ExpandableRow,
  NumericCell,
  SubRow,
  TableHeader,
  TableRow,
  TotalsRow,
} from '@/components/ui/Table';
import {
  positionsColumns,
  watchlistColumns,
  type ColumnTemplate,
} from '@/components/ui/tableColumns';
import { tokens } from '@/theme/tokens';
import { classes } from '../../../../test/classes';

const cells = (n: number, prefix = 'c') =>
  Array.from({ length: n }, (_, i) => <Text key={i}>{`${prefix}${i}`}</Text>);

/** The column wrappers' classes under a row, in order. */
const columnsOf = (testID: string) =>
  within(screen.getByTestId(testID)).getAllByTestId('table-cell').map(classes);

const rowFrame = (testID: string) =>
  classes(screen.getByTestId(testID)).filter(
    c => c === 'gap-col' || c === 'px-table-x' || c === 'flex-row',
  );

function Positions({ open = true }: { open?: boolean }) {
  const cols = positionsColumns;
  return (
    <>
      <TableHeader
        testID="header"
        columns={cols}
        labels={[
          '',
          'Holding',
          'Qty',
          'Avg cost',
          'Total cost',
          'Price',
          'Market value',
          'Unrealised P&L',
          'Action',
        ]}
      />
      <ExpandableRow
        testID="row"
        accessibilityLabel="VWRA"
        columns={cols}
        open={open}
        onToggle={jest.fn()}
        subRows={
          <SubRow testID="sub" columns={cols}>
            {cells(8, 'lot')}
          </SubRow>
        }
      >
        {cells(8)}
      </ExpandableRow>
      <TotalsRow testID="totals" columns={cols}>
        {cells(9, 't')}
      </TotalsRow>
    </>
  );
}

describe('column templates', () => {
  it('Positions has nine columns, Watchlist five', () => {
    expect(positionsColumns).toHaveLength(9);
    expect(watchlistColumns).toHaveLength(5);
  });

  it.each([
    ['Positions', positionsColumns],
    ['Watchlist', watchlistColumns],
  ] as const)('%s: fixed columns never shrink', (_, cols) => {
    for (const col of cols as ColumnTemplate) {
      if (col.className.startsWith('w-')) {
        expect(col.className).toContain('shrink-0');
      }
    }
  });
});

describe('one template for every row', () => {
  it('header, body, expanded sub-rows and totals share the column classes', async () => {
    await render(<Positions />);
    const header = columnsOf('header');
    expect(header).toHaveLength(9);
    expect(columnsOf('row')).toEqual(header);
    // The sub-row's first column also stretches to hold the connector line.
    const [connector, ...rest] = columnsOf('sub');
    expect(connector).toEqual([...header[0]!, 'self-stretch', 'items-center']);
    expect(rest).toEqual(header.slice(1));
    expect(columnsOf('totals')).toEqual(header);
  });

  it('and the same 10px column gap and 8px edge padding', async () => {
    await render(<Positions />);
    const frame = rowFrame('header');
    expect(frame).toEqual(['flex-row', 'gap-col', 'px-table-x']);
    for (const id of ['row', 'sub', 'totals']) {
      expect(rowFrame(id)).toEqual(frame);
    }
  });

  it('right-aligns the numeric columns in every row', async () => {
    await render(<Positions />);
    for (const id of ['header', 'row', 'sub', 'totals']) {
      const cols = columnsOf(id);
      expect(cols[1]).not.toContain('items-end');
      expect(cols[2]).toContain('items-end');
      expect(cols[8]).toContain('items-end');
    }
  });

  it('refuses a row whose cells do not match the template', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      render(
        <TableRow columns={watchlistColumns} testID="bad">
          {cells(4)}
        </TableRow>,
      ),
    ).rejects.toThrow('expected 5 cells, got 4');
    jest.mocked(console.error).mockRestore();
  });
});

describe('TableHeader', () => {
  it('labels the columns in 11px muted text', async () => {
    await render(<Positions />);
    expect(classes(screen.getByText('Holding'))).toEqual(
      expect.arrayContaining(['text-[11px]', 'text-muted']),
    );
  });
});

describe('TableRow', () => {
  it('is 44px tall under a hairline, washing on hover', async () => {
    await render(
      <TableRow testID="row" columns={watchlistColumns} onPress={jest.fn()}>
        {cells(5)}
      </TableRow>,
    );
    expect(classes(screen.getByTestId('row'))).toEqual(
      expect.arrayContaining([
        'min-h-row',
        'border-t',
        'border-row-border',
        'hover:bg-row-hover',
      ]),
    );
  });

  it('shows the charted row selected, without the hover wash', async () => {
    await render(
      <TableRow testID="row" columns={watchlistColumns} selected>
        {cells(5)}
      </TableRow>,
    );
    const row = classes(screen.getByTestId('row'));
    expect(row).toContain('bg-row-selected');
    expect(row).not.toContain('hover:bg-row-hover');
  });

  it('reports presses when it has something to open', async () => {
    const onPress = jest.fn();
    await render(
      <TableRow columns={watchlistColumns} onPress={onPress} testID="row">
        {cells(5)}
      </TableRow>,
    );
    await fireEvent.press(screen.getByTestId('row'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('ExpandableRow', () => {
  it('draws the chevron in the first column itself', async () => {
    await render(<Positions open={false} />);
    const [first] = within(screen.getByTestId('row')).getAllByTestId(
      'table-cell',
    );
    expect(within(first!).getByTestId('row-chevron')).toBeTruthy();
    expect(classes(within(first!).getByTestId('row-chevron-box'))).toEqual(
      expect.arrayContaining(['size-chevron', 'rounded-5', 'bg-chevron-tray']),
    );
  });

  it('hides its sub-rows while closed', async () => {
    await render(<Positions open={false} />);
    expect(screen.queryByTestId('sub')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'VWRA' }).props.accessibilityState,
    ).toMatchObject({ expanded: false });
  });

  it('toggles when pressed', async () => {
    const onToggle = jest.fn();
    await render(
      <ExpandableRow
        accessibilityLabel="VWRA"
        columns={positionsColumns}
        open={false}
        onToggle={onToggle}
        subRows={null}
      >
        {cells(8)}
      </ExpandableRow>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'VWRA' }));
    expect(onToggle).toHaveBeenCalled();
  });

  it('opens its sub-rows into a tinted area, under the row', async () => {
    await render(<Positions />);
    const area = screen.getByTestId('row-sub-area');
    expect(classes(area)).toEqual(
      expect.arrayContaining(['bg-sub-area', 'pb-[6px]']),
    );
    expect(within(area).getByTestId('sub')).toBeTruthy();
  });

  it('runs a vertical connector down the sub-rows’ first column', async () => {
    await render(<Positions />);
    const [first] = within(screen.getByTestId('sub')).getAllByTestId(
      'table-cell',
    );
    expect(classes(within(first!).getByTestId('sub-row-connector'))).toEqual(
      expect.arrayContaining(['w-px', 'flex-1', 'bg-connector']),
    );
    expect(classes(screen.getByTestId('sub'))).toContain('min-h-sub-row');
  });

  describe('the chevron', () => {
    const turnMs = tokens.table.expandMs;
    const turn = () =>
      (
        getAnimatedStyle(screen.getByTestId('row-chevron')) as {
          transform: { rotate: string }[];
        }
      ).transform[0]!.rotate;

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('points right while closed and down while open', async () => {
      await render(<Positions open={false} />);
      expect(turn()).toBe('0deg');
      await screen.rerender(<Positions open />);
      await act(() => jest.advanceTimersByTime(turnMs + 50));
      expect(turn()).toBe('90deg');
    });

    it('turns through the angles in between', async () => {
      await render(<Positions open={false} />);
      await screen.rerender(<Positions open />);
      await act(() => jest.advanceTimersByTime(turnMs / 2));
      const deg = parseFloat(turn());
      expect(deg).toBeGreaterThan(0);
      expect(deg).toBeLessThan(90);
    });

    it('starts at rest when a row mounts open', async () => {
      await render(<Positions open />);
      expect(turn()).toBe('90deg');
    });
  });
});

describe('TotalsRow', () => {
  it('sits under a darker rule in 13px text', async () => {
    await render(<Positions />);
    expect(classes(screen.getByTestId('totals'))).toEqual(
      expect.arrayContaining([
        'border-t',
        'border-totals-border',
        'pt-[8px]',
        'pb-[2px]',
      ]),
    );
  });
});

describe('NumericCell', () => {
  it('stacks US$ over the S$ value, right-aligned, in tabular figures', async () => {
    await render(
      <NumericCell primary="US$12,400.00" secondary="(S$16,755.88)" />,
    );
    expect(classes(screen.getByTestId('numeric-cell'))).toEqual(
      expect.arrayContaining(['items-end', 'gap-[1px]']),
    );
    expect(classes(screen.getByText('US$12,400.00'))).toEqual(
      expect.arrayContaining(['text-[13px]', 'text-ink', 'tabular-nums']),
    );
    expect(classes(screen.getByText('(S$16,755.88)'))).toEqual(
      expect.arrayContaining(['text-[11px]', 'text-muted', 'tabular-nums']),
    );
  });

  it('is a size smaller in a sub-row', async () => {
    await render(<NumericCell size="sub" primary="US$1" secondary="(S$1)" />);
    expect(classes(screen.getByText('US$1'))).toContain('text-[12px]');
    expect(classes(screen.getByText('(S$1)'))).toContain('text-[10px]');
  });

  it('colours a loss, and mutes a cost total', async () => {
    await render(
      <>
        <NumericCell tone="danger" primary="−US$40.00" />
        <NumericCell tone="muted" primary="US$9,000.00" />
      </>,
    );
    expect(classes(screen.getByText('−US$40.00'))).toContain('text-danger');
    expect(classes(screen.getByText('US$9,000.00'))).toContain('text-muted');
  });

  it('puts a lead mark and a percentage beside the primary value', async () => {
    await render(
      <NumericCell
        primary="US$320.00"
        note="+4.2%"
        lead={<Text>dot</Text>}
        secondary="(S$432.38)"
      />,
    );
    const line = screen.getByTestId('numeric-cell-line');
    expect(within(line).getByText('dot')).toBeTruthy();
    expect(classes(within(line).getByText('+4.2%'))).toEqual(
      expect.arrayContaining(['text-[11px]', 'text-muted']),
    );
  });
});
