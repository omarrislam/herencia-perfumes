import { useEffect } from 'react';

export function useSeo(meta: { title: string; description?: string }): void {
  useEffect(() => {
    document.title = meta.title;
    if (meta.description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', 'description');
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', meta.description);
    }
  }, [meta.title, meta.description]);
}
