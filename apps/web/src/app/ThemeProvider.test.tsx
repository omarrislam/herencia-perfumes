import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeProvider';

function Probe() {
  const { theme, toggle } = useTheme();
  return <button onClick={toggle}>theme:{theme}</button>;
}

describe('ThemeProvider', () => {
  it('defaults to light and toggles to dark on <html>', async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByText('theme:light')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText('theme:dark')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
