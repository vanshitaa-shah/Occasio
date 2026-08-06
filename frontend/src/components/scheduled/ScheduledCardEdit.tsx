import { useState, type FormEvent } from 'react';
import type { CardResponse } from '@occasio/shared';
import { toLocalInput } from '../../lib/datetime';

interface ScheduledCardEditProps {
  card: CardResponse;
  onSave: (changes: { recipient: string; sendAt: string }) => void;
  onCancel: () => void;
}

/** Inline form to edit a PENDING card's recipient and send time. */
export function ScheduledCardEdit({
  card,
  onSave,
  onCancel,
}: ScheduledCardEditProps) {
  const [recipient, setRecipient] = useState(card.recipient);
  const [sendAt, setSendAt] = useState(toLocalInput(card.sendAt));
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const when = new Date(sendAt);
    if (Number.isNaN(when.getTime())) return setErr('Invalid date/time.');
    if (when.getTime() <= Date.now()) return setErr('Pick a future time.');
    onSave({ recipient, sendAt: when.toISOString() });
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <input
        type="email"
        required
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
      />
      <input
        type="datetime-local"
        required
        value={sendAt}
        onChange={(e) => setSendAt(e.target.value)}
        className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
      />
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
