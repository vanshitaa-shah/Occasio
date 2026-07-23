import { useState, type FormEvent } from 'react';
import type { CanvasDesign, CardResponse } from '@occasio/shared';
import { api } from '../lib/api';

export type ScheduleStatus =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; card: CardResponse }
  | { kind: 'error'; message: string };

/**
 * Form state + submit logic for scheduling a card. Keeps ScheduleForm purely
 * presentational; validates a future send time before hitting the API.
 */
export function useScheduleCard(design: CanvasDesign) {
  const [recipient, setRecipient] = useState('');
  const [sendAt, setSendAt] = useState('');
  const [status, setStatus] = useState<ScheduleStatus>({ kind: 'idle' });

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
      const card = await api.createCard({
        recipient,
        sendAt: when.toISOString(),
        design,
      });
      setStatus({ kind: 'success', card });
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to schedule.',
      });
    }
  };

  return { recipient, setRecipient, sendAt, setSendAt, status, submit };
}
