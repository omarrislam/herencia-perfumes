import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FindYourScent from './FindYourScent';
import * as api from '../lib/api';

function wrap(ui: React.ReactNode) {
  return <QueryClientProvider client={new QueryClient()}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>;
}

const product = {
  id: 'p1', name: 'Royal Oud', slug: 'royal-oud', type: 'perfume', shortDesc: 's', description: 'd',
  images: ['x'], basePrice: 800, scentFamily: null, notes: { top: [], heart: [], base: [] },
  gender: 'unisex', concentration: 'EDP', rating: { avg: 0, count: 0 }, isFeatured: false, isActive: true, seo: {},
  sizes: [{ label: '50ml', price: 800, stock: 5 }],
};

describe('FindYourScent', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('walks a question and shows recommendations', async () => {
    vi.spyOn(api, 'fetchQuiz').mockResolvedValue([{ id: 'q1', order: 1, question: 'Pick a vibe', answers: [{ label: 'Warm woods' }, { label: 'Fresh' }] }]);
    const submit = vi.spyOn(api, 'submitQuizResult').mockResolvedValue({ scentFamily: null, gender: null, recommended: [product as never] });
    render(wrap(<FindYourScent />));
    await waitFor(() => expect(screen.getByText('Pick a vibe')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Warm woods' }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith({ selections: [{ questionId: 'q1', answerIndex: 0 }] }));
    await waitFor(() => expect(screen.getByText('Royal Oud')).toBeInTheDocument());
  });
});
