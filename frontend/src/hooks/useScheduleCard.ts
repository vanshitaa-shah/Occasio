import { useEffect, useState, type FormEvent } from 'react';
import type { CanvasDesign, CardResponse } from '@occasio/shared';
import { api } from '../lib/api';
import { toLocalInput } from '../lib/datetime';

export type ScheduleStatus =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; card: CardResponse }
  | { kind: 'error'; message: string };

/** When set, the form edits an existing card (PATCH) instead of creating one. */
export interface ScheduleEditing {
  id: string;
  recipient: string;
  sendAt: string;
}

/**
 * Form state + submit for scheduling a card, in create or edit mode. In edit
 * mode it prefills from the card and PATCHes; otherwise it POSTs a new card.
 * The current (possibly edited) `design` is always sent, so canvas edits are
 * saved along with recipient/time.
 */
export function useScheduleCard(
  design: CanvasDesign,
  editing?: ScheduleEditing | null,
  onSaved?: () => void,
) {
  const [recipient, setRecipient] = useState('');
  const [sendAt, setSendAt] = useState('');
  const [status, setStatus] = useState<ScheduleStatus>({ kind: 'idle' });
  const editingId = editing?.id ?? null;

  // Prefill (or clear) the fields when the edited card identity changes.
  useEffect(() => {
    if (editing) {
      setRecipient(editing.recipient);
      setSendAt(toLocalInput(editing.sendAt));
    } else {
      setRecipient('');
      setSendAt('');
    }
    setStatus({ kind: 'idle' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const when = new Date(sendAt);
    if (Number.isNaN(when.getTime())) {
      setStatus({ kind: 'error', message: 'Pick a valid date and time.' });
      return;
    }
    if (when.getTime() <= Date.now()) {
      setStatus({ kind: 'error', message: 'Pick a time in the future.' });
      return;
    }

    setStatus({ kind: 'submitting' });
    try {
      const payload = { recipient, sendAt: when.toISOString(), design };
      const card = editingId
        ? await api.updateCard(editingId, payload)
        : await api.createCard(payload);
      setStatus({ kind: 'success', card });
      onSaved?.();
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to save.',
      });
    }
  };

  return {
    recipient,
    setRecipient,
    sendAt,
    setSendAt,
    status,
    submit,
    isEditing: editingId !== null,
  };
}
