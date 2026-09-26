import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import App from '@/App';

test('renders the net worth figure in each Urbanist weight at 76px', async () => {
  await render(<App />);
  const figures = screen.getAllByTestId(/^font-probe-/);
  expect(
    figures.map(f => {
      const s = StyleSheet.flatten(f.props.style);
      return [s.fontFamily, s.fontWeight, s.fontSize];
    }),
  ).toEqual([
    ['Urbanist', '300', 76],
    ['Urbanist', '400', 76],
    ['Urbanist', '500', 76],
    ['Urbanist', '600', 76],
  ]);
  for (const f of figures) {
    expect(f).toHaveTextContent('S$184,210');
  }
});
