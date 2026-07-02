import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { QuizQuestionPublicDTO, QuizResultDTO, QuizResultInput } from '@herencia/shared';
import { fetchQuiz, submitQuizResult } from '../lib/api';
import { ProductCard } from '../components/ProductCard';

type Selection = { questionId: string; answerIndex: number };

export default function FindYourScent() {
  const [selections, setSelections] = useState<Selection[]>([]);
  const [result, setResult] = useState<QuizResultDTO | null>(null);

  const { data: questions, isLoading, isError } = useQuery({
    queryKey: ['quiz'],
    queryFn: fetchQuiz,
  });

  const mutation = useMutation({
    mutationFn: (input: QuizResultInput) => submitQuizResult(input),
    onSuccess: (data) => setResult(data),
  });

  const currentIndex = selections.length;
  const currentQuestion: QuizQuestionPublicDTO | undefined = questions?.[currentIndex];

  const handleAnswer = (question: QuizQuestionPublicDTO, answerIndex: number) => {
    const newSelections = [...selections, { questionId: question.id, answerIndex }];
    setSelections(newSelections);
    if (questions && newSelections.length === questions.length) {
      mutation.mutate({ selections: newSelections });
    }
  };

  const reset = () => {
    setSelections([]);
    setResult(null);
    mutation.reset();
  };

  if (isLoading) {
    return <p className="py-8 text-center font-body text-muted">Loading quiz…</p>;
  }
  if (isError) {
    return <p className="py-8 text-center font-body text-muted">Failed to load quiz.</p>;
  }

  const total = questions?.length ?? 0;
  const pct = total ? Math.round((currentIndex / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8 text-center">
        <p className="eyebrow">The Ritual</p>
        <h1 className="display mt-2 text-3xl text-content md:text-4xl">Find Your Scent</h1>
      </div>

      {result ? (
        <div>
          <div className="mb-8 text-center">
            <p className="eyebrow">Your scent profile</p>
            {result.scentFamily && (
              <h2 className="display mt-2 text-3xl text-content">{result.scentFamily.name}</h2>
            )}
            <div className="rule-gold mx-auto mt-4 w-24" />
          </div>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
            {result.recommended.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <button type="button" onClick={reset} className="btn-outline mx-auto mt-10 block">
            Start over
          </button>
        </div>
      ) : mutation.isPending ? (
        <p className="py-16 text-center font-body text-muted">Composing your recommendation…</p>
      ) : currentQuestion ? (
        <div className="card-lux rounded-2xl p-8">
          <div className="mb-6">
            <div className="mb-2 flex justify-between font-body text-xs tracking-wide text-muted">
              <span>Question {currentIndex + 1}</span>
              <span>{currentIndex + 1} / {total}</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-hairline">
              <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <h2 className="mb-6 font-display text-2xl leading-snug text-content">
            {currentQuestion.question}
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.answers.map((answer, idx) => (
              <button
                key={`${currentQuestion.id}-${idx}`}
                type="button"
                onClick={() => handleAnswer(currentQuestion, idx)}
                className="w-full rounded-xl border border-line bg-surface px-5 py-4 text-left font-body text-content transition-all hover:border-accent hover:bg-accent hover:text-surface"
              >
                {answer.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
