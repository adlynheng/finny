import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card } from '@/components/ui/Card';
import { tokens } from '@/theme/tokens';

const classes = (el: { props: { className?: string } }) =>
  (el.props.className ?? '').split(/\s+/).filter(Boolean);

describe('Card', () => {
  it('renders its children', async () => {
    await render(
      <Card>
        <Text>Goals</Text>
      </Card>,
    );
    expect(screen.getByText('Goals')).toBeTruthy();
  });

  it('is the card glass recipe', async () => {
    await render(<Card testID="card" />);
    const card = screen.getByTestId('card');
    expect(classes(screen.getByTestId('glass-fill'))).toContain(
      'bg-glass-card',
    );
    expect(classes(card)).toContain('border-glass-card-border');
    expect(card.props.style).toEqual({ boxShadow: tokens.glass.card.shadow });
  });

  it('has the card chrome, plus the caller’s classes', async () => {
    await render(<Card testID="card" className="flex-1 gap-3" />);
    expect(classes(screen.getByTestId('card'))).toEqual(
      expect.arrayContaining([
        'rounded-6',
        'ios:rounded-8',
        'p-card',
        'flex-1',
        'gap-3',
      ]),
    );
  });
});
