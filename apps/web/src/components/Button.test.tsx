import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders children and fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Shop now</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Shop now' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies the secondary variant class', () => {
    render(<Button variant="secondary">x</Button>);
    expect(screen.getByRole('button').className).toContain('border');
  });
});
