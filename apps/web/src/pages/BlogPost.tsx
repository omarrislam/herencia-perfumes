import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBlogPost } from '../lib/api';
import { useSeo } from '../lib/useSeo';
import { cld } from '../lib/cloudinary';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['blog', slug],
    queryFn: () => fetchBlogPost(slug!),
    enabled: !!slug,
  });

  useSeo({
    title: post ? (post.seo.title ?? post.title + ' — HERENCIA') : 'Journal — HERENCIA',
    description: post ? (post.seo.description ?? post.excerpt) : undefined,
  });

  if (isLoading) return <p className="py-8 text-center font-body text-muted">Loading…</p>;

  if (isError || !post) {
    return (
      <div className="py-8 text-center">
        <p className="font-body text-muted">Post not found</p>
        <Link to="/blog" className="font-body text-sm text-accent hover:underline">← Back to Journal</Link>
      </div>
    );
  }

  const paragraphs = post.body.split(/\n\n+/);

  return (
    <article className="mx-auto max-w-2xl py-10">
      <h1 className="mb-4 font-display text-3xl text-content">{post.title}</h1>
      {post.coverImage && (
        <img
          src={cld(post.coverImage, { w: 800 })}
          alt={post.title}
          className="mb-6 w-full rounded-lg object-cover"
        />
      )}
      <div className="space-y-4 font-body text-content">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  );
}
