import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateReviewInput } from '@herencia/shared';
import { fetchReviews, submitReview, ApiError } from '../../lib/api';
import { useAuth } from '../auth/AuthContext';


interface ReviewsSectionProps {
  slug: string;
  productId: string;
}

export function ReviewsSection({ slug }: ReviewsSectionProps) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [apiErr, setApiErr] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reviews', slug],
    queryFn: () => fetchReviews(slug),
  });

  const mutation = useMutation({
    mutationFn: (input: CreateReviewInput) => submitReview(slug, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reviews', slug] });
      setSubmitted(true);
      setApiErr(null);
      setRating(5);
      setTitle('');
      setBody('');
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setApiErr(err.message);
      } else {
        setApiErr('Something went wrong. Please try again.');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApiErr(null);
    const input: CreateReviewInput = { rating, body };
    if (title.trim()) input.title = title.trim();
    mutation.mutate(input);
  };

  return (
    <section aria-labelledby="reviews-heading" className="space-y-6">
      <div>
        <p className="eyebrow">What they say</p>
        <h2 id="reviews-heading" className="display mt-2 text-2xl text-content md:text-3xl">
          Reviews
        </h2>
        <div className="rule-gold-left mt-4" />
      </div>

      {isLoading && <p className="font-body text-sm text-muted">Loading reviews…</p>}
      {isError && <p className="font-body text-sm text-danger">Could not load reviews.</p>}

      {data && data.items.length === 0 && (
        <p className="font-body text-sm text-muted">No reviews yet. Be the first!</p>
      )}

      {data && data.items.length > 0 && (
        <ul className="space-y-4">
          {data.items.map((review) => (
            <li key={review.id} className="card-lux space-y-1 rounded-xl p-5">
              <div className="flex items-center gap-2">
                <span className="font-body text-sm text-accent" aria-label={`Rated ${review.rating} of 5`}>
                  {'★'.repeat(Math.round(review.rating))}{'☆'.repeat(5 - Math.round(review.rating))}
                </span>
                <span className="font-body text-sm font-medium text-content">{review.user.name}</span>
              </div>
              {review.title && (
                <p className="font-body text-sm font-semibold text-content">{review.title}</p>
              )}
              <p className="font-body text-sm text-content">{review.body}</p>
              <p className="font-body text-xs text-muted">
                {new Date(review.createdAt).toLocaleDateString('en-GB')}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-hairline pt-6">
        {user === null ? (
          <p className="font-body text-sm text-muted">
            <Link to="/login" className="link-underline text-accent">
              Sign in to write a review
            </Link>
          </p>
        ) : submitted ? (
          <p className="font-body text-sm text-success">
            Thank you — your review is pending moderation.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="card-lux space-y-4 rounded-xl p-6">
            <h3 className="font-display text-lg text-content">Write a review</h3>

            <div className="space-y-1">
              <label htmlFor="review-rating" className="font-body text-sm text-muted">
                Rating
              </label>
              <select
                id="review-rating"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="field-lux w-auto text-sm"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {'★'.repeat(n)} ({n}/5)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="review-title" className="font-body text-sm text-muted">
                Title <span className="text-xs">(optional)</span>
              </label>
              <input
                id="review-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="Summary of your review"
                className="field-lux text-sm placeholder:text-muted"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="review-body" className="font-body text-sm text-muted">
                Review
              </label>
              <textarea
                id="review-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={4}
                maxLength={2000}
                placeholder="Share your experience…"
                className="field-lux text-sm placeholder:text-muted"
              />
            </div>

            {apiErr && <p className="font-body text-sm text-danger">{apiErr}</p>}

            <button
              type="submit"
              disabled={mutation.isPending || !body.trim()}
              className="btn-lux disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation.isPending ? 'Submitting…' : 'Submit review'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
