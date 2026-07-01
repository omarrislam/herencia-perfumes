import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/**
 * Traps focus within the returned ref's element while `active`, and restores
 * focus to the previously-focused element on deactivate. Attach the ref to a
 * modal/dialog container.
 *
 * Visibility caveat: focusables are filtered by the `[hidden]` attribute and
 * `disabled` only — NOT by CSS `display:none`/`visibility:hidden` (jsdom has no
 * layout engine, so `offsetParent`-based detection can't be unit-tested). Safe
 * for containers whose focusables are all visible when open (e.g. the cart
 * drawer). Before reusing this hook in a modal that contains CSS-hidden
 * focusables, add a `getComputedStyle` visibility check to the filter.
 */
export function useFocusTrap(active: boolean): RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.closest('[hidden]') && !el.hasAttribute('disabled'),
      );
    focusables()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [active]);
  return ref;
}
