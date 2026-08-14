import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LineChart } from './LineChart';

const pts = (values: number[]) =>
  values.map((y, i) => ({ x: `2026-08-${String(i + 1).padStart(2, '0')}`, y }));

describe('LineChart', () => {
  it('draws one coordinate per datum', () => {
    const { container } = render(<LineChart points={pts([10, 20, 30])} label="Revenue" />);
    const d = container.querySelector('path[data-series="main"]')!.getAttribute('d')!;
    expect(d.match(/[ML]/g)).toHaveLength(3);
  });

  it('shows an empty state instead of an empty chart', () => {
    render(<LineChart points={[]} label="Revenue" />);
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it('does not divide by zero when every value is identical', () => {
    const { container } = render(<LineChart points={pts([5, 5, 5])} label="Flat" />);
    const d = container.querySelector('path[data-series="main"]')!.getAttribute('d')!;
    expect(d).not.toContain('NaN');
  });

  it('handles a single point without NaN', () => {
    const { container } = render(<LineChart points={pts([7])} label="One" />);
    const d = container.querySelector('path[data-series="main"]')!.getAttribute('d')!;
    expect(d).not.toContain('NaN');
  });

  it('draws the comparison series dashed, so identity is not colour-alone', () => {
    const { container } = render(
      <LineChart points={pts([10, 20])} comparison={pts([5, 8])} label="Revenue" comparisonLabel="Previous" />,
    );
    const cmp = container.querySelector('path[data-series="comparison"]')!;
    expect(cmp).toBeTruthy();
    expect(cmp.getAttribute('stroke-dasharray')).toBeTruthy();
  });

  it('renders a legend when there are two series and none for one', () => {
    const { container, rerender } = render(
      <LineChart points={pts([1, 2])} comparison={pts([1, 1])} label="Revenue" comparisonLabel="Previous" />,
    );
    const legend = container.querySelector('figcaption')!;
    expect(legend.textContent).toContain('Revenue');
    expect(legend.textContent).toContain('Previous');

    // A single series needs no legend box — the surrounding heading names it.
    rerender(<LineChart points={pts([1, 2])} label="Revenue" />);
    expect(container.querySelector('figcaption')).toBeNull();
  });

  it('exposes the numbers as an accessible table, not colour alone', () => {
    render(<LineChart points={pts([10, 20])} label="Revenue" />);
    const table = screen.getByRole('table', { hidden: true });
    expect(table).toBeTruthy();
    expect(table.textContent).toContain('20');
  });

  it('describes itself for screen readers', () => {
    render(<LineChart points={pts([10, 20])} label="Revenue" />);
    expect(screen.getByRole('img', { name: /revenue/i })).toBeInTheDocument();
  });
});
