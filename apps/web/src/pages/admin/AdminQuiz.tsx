// apps/web/src/pages/admin/AdminQuiz.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { QuizQuestionAdminDTO, QuizQuestionInput } from '@herencia/shared';
import { GENDER } from '@herencia/shared';
import {
  adminFetchQuiz,
  adminCreateQuestion,
  adminUpdateQuestion,
  adminDeleteQuestion,
} from '../../features/admin/adminClient';
import { fetchScentFamilies } from '../../lib/api';

type AnswerDraft = {
  label: string;
  scentFamily: string;
  gender: string;
  value: number;
};

const emptyAnswer = (): AnswerDraft => ({ label: '', scentFamily: '', gender: '', value: 1 });

type QuestionForm = {
  question: string;
  order: number;
  answers: AnswerDraft[];
};

const emptyForm = (): QuestionForm => ({
  question: '',
  order: 0,
  answers: [emptyAnswer(), emptyAnswer()],
});

function buildInput(form: QuestionForm): QuizQuestionInput {
  return {
    question: form.question,
    order: form.order,
    answers: form.answers.map((a) => ({
      label: a.label,
      weights: {
        scentFamily: a.scentFamily || undefined,
        gender: (a.gender as QuizQuestionInput['answers'][number]['weights']['gender']) || undefined,
        value: a.value,
      },
    })),
  };
}

function AnswerFields({
  answers,
  scentFamilyOptions,
  onChange,
  onAdd,
  onRemove,
}: {
  answers: AnswerDraft[];
  scentFamilyOptions: { id: string; name: string }[];
  onChange: (idx: number, field: keyof AnswerDraft, value: string | number) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="mt-3 space-y-2">
      {answers.map((a, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-end">
          <label className="block">
            <span className="font-body text-xs text-muted">Label</span>
            <input
              value={a.label}
              onChange={(e) => onChange(idx, 'label', e.target.value)}
              placeholder="Answer label"
              className="mt-0.5 w-full rounded border border-line bg-bg px-2 py-1 font-body text-sm text-content"
            />
          </label>
          <label className="block">
            <span className="font-body text-xs text-muted">Scent family</span>
            <select
              value={a.scentFamily}
              onChange={(e) => onChange(idx, 'scentFamily', e.target.value)}
              className="mt-0.5 w-full rounded border border-line bg-bg px-2 py-1 font-body text-sm text-content"
            >
              <option value="">None</option>
              {scentFamilyOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-body text-xs text-muted">Gender</span>
            <select
              value={a.gender}
              onChange={(e) => onChange(idx, 'gender', e.target.value)}
              className="mt-0.5 w-full rounded border border-line bg-bg px-2 py-1 font-body text-sm text-content"
            >
              <option value="">None</option>
              {GENDER.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-body text-xs text-muted">Value</span>
            <input
              type="number"
              min={0}
              max={10}
              value={a.value}
              onChange={(e) => onChange(idx, 'value', Number(e.target.value))}
              className="mt-0.5 w-16 rounded border border-line bg-bg px-2 py-1 font-body text-sm text-content"
            />
          </label>
          <button
            type="button"
            onClick={() => onRemove(idx)}
            disabled={answers.length <= 2}
            className="rounded border border-line px-2 py-1 font-body text-sm text-danger disabled:opacity-40"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        disabled={answers.length >= 8}
        className="font-body text-sm text-accent disabled:opacity-40 hover:underline"
      >
        + Add answer
      </button>
    </div>
  );
}

function QuestionFormPanel({
  initial,
  scentFamilyOptions,
  onSubmit,
  onCancel,
  isPending,
  error,
}: {
  initial: QuestionForm;
  scentFamilyOptions: { id: string; name: string }[];
  onSubmit: (input: QuizQuestionInput) => void;
  onCancel: () => void;
  isPending: boolean;
  error: Error | null;
}) {
  const [form, setForm] = useState<QuestionForm>(initial);

  const setField = <K extends keyof QuestionForm>(k: K, v: QuestionForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const changeAnswer = (idx: number, field: keyof AnswerDraft, value: string | number) =>
    setForm((f) => {
      const answers = f.answers.map((a, i) => (i === idx ? { ...a, [field]: value } : a));
      return { ...f, answers };
    });

  const addAnswer = () =>
    setForm((f) => ({ ...f, answers: [...f.answers, emptyAnswer()] }));

  const removeAnswer = (idx: number) =>
    setForm((f) => ({ ...f, answers: f.answers.filter((_, i) => i !== idx) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.answers.length < 2 || form.answers.length > 8) return;
    onSubmit(buildInput(form));
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-line bg-surface p-4">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <label className="block">
          <span className="font-body text-sm text-muted">Question text</span>
          <input
            value={form.question}
            onChange={(e) => setField('question', e.target.value)}
            placeholder="e.g. What mood do you want to evoke?"
            className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 font-body text-content"
            required
          />
        </label>
        <label className="block">
          <span className="font-body text-sm text-muted">Order</span>
          <input
            type="number"
            min={0}
            value={form.order}
            onChange={(e) => setField('order', Number(e.target.value))}
            className="mt-1 w-20 rounded border border-line bg-bg px-3 py-2 font-body text-content"
          />
        </label>
      </div>
      <AnswerFields
        answers={form.answers}
        scentFamilyOptions={scentFamilyOptions}
        onChange={changeAnswer}
        onAdd={addAnswer}
        onRemove={removeAnswer}
      />
      {error && (
        <p className="mt-2 font-body text-sm text-danger">{error.message}</p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-maroon px-4 py-2 font-body text-cream disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-line px-4 py-2 font-body text-muted hover:text-accent"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AdminQuiz() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<QuizQuestionAdminDTO | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: questions, isLoading, isError } = useQuery({
    queryKey: ['admin-quiz'],
    queryFn: adminFetchQuiz,
  });

  const { data: families } = useQuery({
    queryKey: ['scent-families'],
    queryFn: fetchScentFamilies,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['admin-quiz'] });

  const createMut = useMutation({
    mutationFn: (input: QuizQuestionInput) => adminCreateQuestion(input),
    onSuccess: () => {
      setCreating(false);
      invalidate();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: QuizQuestionInput }) =>
      adminUpdateQuestion(id, input),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeleteQuestion(id),
    onSuccess: invalidate,
  });

  const scentFamilyOptions = (families ?? []).map((f) => ({ id: f.id, name: f.name }));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-content">Quiz questions</h1>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="rounded bg-maroon px-4 py-2 font-body text-sm text-cream"
          >
            + New question
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-6">
          <QuestionFormPanel
            initial={emptyForm()}
            scentFamilyOptions={scentFamilyOptions}
            onSubmit={(input) => createMut.mutate(input)}
            onCancel={() => setCreating(false)}
            isPending={createMut.isPending}
            error={createMut.isError ? (createMut.error as Error) : null}
          />
        </div>
      )}

      {isLoading && <p className="font-body text-muted">Loading…</p>}
      {isError && <p className="font-body text-danger">Failed to load questions.</p>}

      {questions && questions.length === 0 && !creating && (
        <p className="font-body text-muted">No questions yet.</p>
      )}

      <div className="space-y-4">
        {questions?.map((q) => (
          <div key={q.id} className="rounded-lg border border-line p-4">
            {editing?.id === q.id ? (
              <QuestionFormPanel
                initial={{
                  question: q.question,
                  order: q.order,
                  answers: q.answers.map((a) => ({
                    label: a.label,
                    scentFamily: a.weights.scentFamily ?? '',
                    gender: a.weights.gender ?? '',
                    value: a.weights.value,
                  })),
                }}
                scentFamilyOptions={scentFamilyOptions}
                onSubmit={(input) => updateMut.mutate({ id: q.id, input })}
                onCancel={() => setEditing(null)}
                isPending={updateMut.isPending}
                error={updateMut.isError ? (updateMut.error as Error) : null}
              />
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-body text-xs text-muted">Order: {q.order}</p>
                    <p className="font-display text-lg text-content">{q.question}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(q)}
                      className="font-body text-sm text-accent hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${q.question}"?`)) {
                          deleteMut.mutate(q.id);
                        }
                      }}
                      className="font-body text-sm text-danger hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <ul className="mt-2 space-y-1">
                  {q.answers.map((a, idx) => (
                    <li key={idx} className="font-body text-sm text-content">
                      <span className="text-muted">{idx + 1}.</span> {a.label}
                      {(a.weights.scentFamily || a.weights.gender) && (
                        <span className="ml-2 text-xs text-muted">
                          [{[a.weights.scentFamily, a.weights.gender].filter(Boolean).join(' / ')}
                          {' '}val:{a.weights.value}]
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ))}
      </div>

      {deleteMut.isError && (
        <p className="mt-3 font-body text-sm text-danger">Delete failed.</p>
      )}
    </div>
  );
}
