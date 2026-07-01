import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useFocusTrap } from './useFocusTrap';

function Harness() {
  const [open, setOpen] = useState(false);
  const ref = useFocusTrap(open);
  return (
    <div>
      <button onClick={() => setOpen(true)}>opener</button>
      {open && (
        <div ref={ref} role="dialog">
          <button>first</button>
          <button onClick={() => setOpen(false)}>close</button>
        </div>
      )}
    </div>
  );
}

describe('useFocusTrap', () => {
  it('focuses the first focusable on open and restores on close', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByText('opener');
    opener.focus();
    await user.click(opener);
    expect(screen.getByText('first')).toHaveFocus();
    await user.click(screen.getByText('close'));
    expect(opener).toHaveFocus();
  });
});
