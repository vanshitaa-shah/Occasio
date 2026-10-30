import { useEffect, useState } from 'react';
import type { CanvasDesign } from '@occasio/shared';
import { createDemoCards } from '../lib/demoCards';
import {
  useScheduleCard,
  type ScheduleEditing,
} from '../hooks/useScheduleCard';

interface ScheduleFormProps {
  design: CanvasDesign;
  editing?: ScheduleEditing | null;
  onSaved?: () => void;
  /** Reports when a save is in flight, so the page can lock the whole editor. */
  onSubmittingChange?: (submitting: boolean) => void;
}

export function ScheduleForm({
  design,
  editing,
  onSaved,
  onSubmittingChange,
}: ScheduleFormProps) {
  const { recipient, setRecipient, sendAt, setSendAt, status, submit, isEditing } =
    useScheduleCard(design, editing, onSaved);

  const [demo, setDemo] = useState<
    { kind: 'idle' | 'adding' | 'done' } | { kind: 'error'; message: string }
  >({ kind: 'idle' });
  const submitting = status.kind === 'submitting';
  const addingDemo = demo.kind === 'adding';

  const addDemoCards = async () => {
    setDemo({ kind: 'adding' });
    try {
      await createDemoCards();
      setDemo({ kind: 'done' });
    } catch (err) {
      setDemo({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to add demo cards.',
      });
    }
  };
  useEffect(() => onSubmittingChange?.(submitting), [submitting, onSubmittingChange]);
  const label = isEditing
    ? submitting
      ? 'Saving…'
      : 'Save changes'
    : submitting
      ? 'Scheduling…'
      : 'Schedule card';

  return (
    <form onSubmit={submit}>
      {/* A disabled fieldset disables every field + the button while saving. */}
      <fieldset disabled={submitting || addingDemo} className="min-w-0 space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Recipient email</span>
        <input
          type="email"
          required
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="friend@example.com"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-hidden disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Send at</span>
        <input
          type="datetime-local"
          required
          value={sendAt}
          onChange={(e) => setSendAt(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-hidden disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        />
      </label>

      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={() => void addDemoCards()}
          className="w-full rounded-lg border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {addingDemo ? 'Adding…' : 'Add 10 demo cards'}
        </button>
      )}
      {demo.kind === 'done' && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Added 10 demo cards. See them under Scheduled.
        </p>
      )}
      {demo.kind === 'error' && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {demo.message}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {label}
      </button>

      {status.kind === 'error' && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {status.message}
        </p>
      )}
      </fieldset>
    </form>
  );
}
