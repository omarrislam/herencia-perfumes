import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordReveal } from './WordReveal';

describe('WordReveal', () => {
  it('renders one animated span per word', () => {
    const { container } = render(<WordReveal text="Luxury in every drop" />);
    expect(container.querySelectorAll('.word-rise')).toHaveLength(4);
  });

  it('staggers the words in reading order', () => {
    const { container } = render(<WordReveal text="Luxury in every drop" delay={100} step={50} />);
    const delays = [...container.querySelectorAll<HTMLElement>('.word-rise')].map((el) =>
      parseFloat(el.style.animationDelay),
    );
    expect(delays).toEqual([100, 150, 200, 250]);
  });

  it('keeps a newline as a separate line and keeps counting across it', () => {
    const { container } = render(<WordReveal text={'Samples first.\nBottles later.'} delay={0} step={10} />);
    expect(container.querySelectorAll('span.block')).toHaveLength(2);
    const delays = [...container.querySelectorAll<HTMLElement>('.word-rise')].map((el) =>
      parseFloat(el.style.animationDelay),
    );
    // Four words total, cadence unbroken by the line break.
    expect(delays).toEqual([0, 10, 20, 30]);
  });

  it('reads as one sentence to assistive tech, not a list of words', () => {
    render(<WordReveal text="Luxury in every drop" />);
    // The words themselves are aria-hidden; the label carries the full string.
    expect(screen.getByLabelText('Luxury in every drop')).toBeInTheDocument();
  });

  it('preserves spacing between words', () => {
    const { container } = render(<WordReveal text="Luxury in every drop" />);
    expect(container.textContent).toBe('Luxury in every drop ');
  });

  it('survives extra whitespace without emitting empty words', () => {
    const { container } = render(<WordReveal text="  Luxury   in  " />);
    expect(container.querySelectorAll('.word-rise')).toHaveLength(2);
  });
});
