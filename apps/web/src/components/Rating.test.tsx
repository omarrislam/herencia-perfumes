import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Rating } from './Rating';

describe('Rating', () => {
  it('renders nothing when there are no reviews', () => {
    // "No reviews yet" on every card advertises an absence.
    const { container } = render(<Rating avg={0} count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders stars and the count once there are reviews', () => {
    render(<Rating avg={4} count={7} />);
    expect(screen.getByLabelText('Rated 4 of 5 from 7 reviews')).toBeInTheDocument();
    expect(screen.getByText('(7)')).toBeInTheDocument();
  });

  it('rounds a fractional average to whole stars', () => {
    const { container } = render(<Rating avg={4.6} count={3} />);
    expect(container.textContent).toContain('★★★★★');
  });
});
