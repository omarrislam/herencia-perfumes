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
    <div>
      <div className="mb-10">
        <p className="eyebrow">Notes on scent &amp; craft</p>
        <h1 className="display mt-2 text-3xl text-content md:text-4xl">Journal</h1>
        <div className="rule-gold-left mt-4" />
      </div>
      {data && data.items.length === 0 && (
        <p className="py-16 text-center font-body text-muted">No posts yet.</p>
      )}
      <Reveal>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((post) => (
            <article key={post.id} className="card-lux group overflow-hidden rounded-xl">
              <Link to={'/blog/' + post.slug} className="block">
                {post.coverImage && (
                  <div className="aspect-[16/10] overflow-hidden bg-surface2">
                    <img
                      src={cld(post.coverImage, { w: 600 })}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05] motion-reduce:transform-none motion-reduce:transition-none"
                    />
                  </div>
                )}
                <div className="space-y-2 p-5">
                  <p className="eyebrow">
                    {new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <h2 className="font-display text-lg leading-snug text-content transition-colors group-hover:text-accent">
                    {post.title}
                  </h2>
                  <p className="line-clamp-3 font-body text-sm leading-relaxed text-muted">{post.excerpt}</p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
