import type {
  CardResponse,
  CreateCardDto,
  UpdateCardDto,
} from '@occasio/shared';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  // 204 No Content (e.g. DELETE) has no body to parse.
  if (res.status === 204) return undefined as T;
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
  updateCard: (id: string, body: UpdateCardDto) =>
    request<CardResponse>(`/cards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  retryCard: (id: string) =>
    request<CardResponse>(`/cards/${id}/retry`, { method: 'POST' }),
  deleteCard: (id: string) =>
    request<void>(`/cards/${id}`, { method: 'DELETE' }),
};
