import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBlogPost } from '../lib/api';
import { useSeo } from '../lib/useSeo';
import { cld } from '../lib/cloudinary';
import { renderMarkdownSafe } from '../lib/markdown';

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

  return (
    <article className="mx-auto max-w-3xl">
      <Link to="/blog" className="link-underline font-body text-sm text-accent">← Journal</Link>
      <div className="mt-6 mb-8 text-center">
        <p className="eyebrow">
          {new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="display mx-auto mt-3 max-w-2xl text-4xl text-content md:text-5xl">{post.title}</h1>
      </div>
      {post.coverImage && (
        <img
          src={cld(post.coverImage, { w: 1000 })}
          alt={post.title}
          className="mb-10 aspect-[16/9] w-full rounded-2xl object-cover shadow-lux"
        />
      )}
      <div
        className="prose-herencia mx-auto font-body text-content"
        dangerouslySetInnerHTML={{ __html: renderMarkdownSafe(post.body) }}
      />
    </article>
  );
}
