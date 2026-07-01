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

  return (
    <div className="mx-auto max-w-xl py-10">
      <h1 className="mb-6 text-center font-display text-3xl text-content">Find Your Scent</h1>

      {result ? (
        <div>
          <h2 className="mb-4 text-center font-display text-2xl text-content">Your scent profile</h2>
          {result.scentFamily && (
            <p className="mb-4 text-center font-body text-muted">{result.scentFamily.name}</p>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {result.recommended.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <button
            type="button"
            onClick={reset}
            className="mx-auto mt-8 block font-body text-sm text-muted hover:text-accent"
          >
            Start over
          </button>
        </div>
      ) : mutation.isPending ? (
        <p className="py-8 text-center font-body text-muted">Finding your perfect scent…</p>
      ) : currentQuestion ? (
        <div>
          <p className="mb-2 text-center font-body text-sm text-muted">
            {currentIndex + 1} / {questions?.length}
          </p>
          <h2 className="mb-6 text-center font-display text-2xl text-content">
            {currentQuestion.question}
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.answers.map((answer, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAnswer(currentQuestion, idx)}
                className="w-full rounded-lg border border-line bg-surface px-4 py-3 font-body text-content transition-colors hover:bg-maroon hover:text-cream"
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
