import { useCallback, useEffect, useState } from 'react';
import type { CardResponse } from '@occasio/shared';
import { api } from '../lib/api';

/**
 * Loads the scheduled cards and exposes cancel / retry / edit actions, each of
 * which refreshes the list so the UI reflects the new server state.
 */
export function useScheduledCards() {
  const [cards, setCards] = useState<CardResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCards(await api.listCards());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cards.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const cancel = useCallback(
    async (id: string) => {
      await api.deleteCard(id);
      await refresh();
    },
    [refresh],
  );

  const retry = useCallback(
    async (id: string) => {
      await api.retryCard(id);
      await refresh();
    },
    [refresh],
  );

  return { cards, loading, error, refresh, cancel, retry };
}
