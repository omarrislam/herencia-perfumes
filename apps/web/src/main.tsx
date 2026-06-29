import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, useTheme } from './app/ThemeProvider';
import { Button } from './components/Button';
import './styles/index.css';

function App() {
  const { theme, toggle } = useTheme();
  return (
    <main className="min-h-screen grid place-items-center gap-6 p-8 text-center">
      <h1 className="font-display text-4xl text-content">HERENCIA</h1>
      <p className="font-body text-muted">Luxury in every drop.</p>
      <Button onClick={toggle}>Toggle theme (now: {theme})</Button>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
