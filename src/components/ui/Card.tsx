import { cx } from './cardChrome';
import { Glass, type GlassProps } from './Glass';

type Props = Omit<GlassProps, 'recipe' | 'radius'>;

/**
 * The plain glass card: the Transactions, Positions and Goals panels. The card
 * chrome, as GradientCard's: the card radius and 18px padding.
 */
export function Card({ className, ...rest }: Props) {
  return (
    <Glass
      {...rest}
      recipe="card"
      radius="card"
      className={cx('p-card', className)}
    />
  );
}
