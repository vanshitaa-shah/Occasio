import type { CardResponse, CreateCardDto } from '@occasio/shared';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  createCard: (body: CreateCardDto) =>
    request<CardResponse>('/cards', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  listCards: () => request<CardResponse[]>('/cards'),
  getCard: (id: string) => request<CardResponse>(`/cards/${id}`),
};
