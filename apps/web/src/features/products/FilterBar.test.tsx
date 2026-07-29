import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FilterBar } from './FilterBar';

describe('FilterBar search', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // Typing used to write the URL (and fire a request) on every keystroke, so a
  // five-letter query cost five round trips.
  it('reports the search term once the typing stops, not per keystroke', () => {
    const onChange = vi.fn();
    render(<FilterBar families={[]} filters={{}} onChange={onChange} onReset={vi.fn()} />);
    const input = screen.getByLabelText(/search perfumes/i);

    for (const value of ['a', 'am', 'amb', 'ambe', 'amber']) {
      fireEvent.change(input, { target: { value } });
      act(() => void vi.advanceTimersByTime(50));
    }
    expect(onChange).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(300));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('q', 'amber');
  });

  it('clears the filter when the box is emptied', () => {
    const onChange = vi.fn();
    render(<FilterBar families={[]} filters={{ q: 'amber' }} onChange={onChange} onReset={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/search perfumes/i), { target: { value: '' } });
    act(() => void vi.advanceTimersByTime(300));
    expect(onChange).toHaveBeenCalledWith('q', undefined);
  });

  it('does not fire on mount for a term that came from the URL', () => {
    const onChange = vi.fn();
    render(<FilterBar families={[]} filters={{ q: 'amber' }} onChange={onChange} onReset={vi.fn()} />);
    act(() => void vi.advanceTimersByTime(500));
    expect(onChange).not.toHaveBeenCalled();
  });
});
