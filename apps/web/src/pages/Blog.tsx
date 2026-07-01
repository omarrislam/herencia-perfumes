import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBlogList } from '../lib/api';
import { useSeo } from '../lib/useSeo';
import { cld } from '../lib/cloudinary';
import { Reveal } from '../components/Reveal';

export default function Blog() {
  const [page] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['blog', page, undefined],
    queryFn: () => fetchBlogList(page),
  });

  useSeo({ title: 'Journal — HERENCIA', description: 'Notes on scent, heritage, and craft.' });

  if (isLoading) return <p className="py-8 text-center font-body text-muted">Loading…</p>;
  if (isError) return <p className="py-8 text-center font-body text-muted">Failed to load posts.</p>;

  return (
    <div className="py-10">
      <h1 className="mb-8 font-display text-3xl text-content">Journal</h1>
      {data && data.items.length === 0 && (
        <p className="font-body text-muted">No posts yet.</p>
      )}
      <Reveal>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data?.items.map((post) => (
          <article key={post.id} className="overflow-hidden rounded-lg border border-line bg-surface">
            {post.coverImage && (
              <img
                src={cld(post.coverImage, { w: 600 })}
                alt={post.title}
                className="aspect-video w-full object-cover"
              />
            )}
            <div className="space-y-2 p-4">
              <Link
                to={'/blog/' + post.slug}
                className="block font-display text-lg text-content hover:text-accent"
              >
                {post.title}
              </Link>
              <p className="line-clamp-3 font-body text-sm text-muted">{post.excerpt}</p>
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-bg px-2 py-0.5 font-body text-xs text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <p className="font-body text-xs text-muted">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </div>
          </article>
        ))}
        </div>
      </Reveal>
    </div>
  );
}
