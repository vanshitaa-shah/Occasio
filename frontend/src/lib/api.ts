import type {
  AuthCredentialsDto,
  AuthResponse,
  CardResponse,
  CreateCardDto,
  UpdateCardDto,
} from '@occasio/shared';
import { authStorage } from './authStorage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  const token = authStorage.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  // An expired/invalid token on a protected call → sign out and bounce to login.
  if (res.status === 401 && !path.startsWith('/auth')) {
    authStorage.clear();
    window.location.assign('/login');
    throw new Error('Session expired');
  }
  if (!res.ok) {
    throw new Error(await errorMessage(res));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    const m = body.message;
    if (Array.isArray(m)) return m.join(', ');
    if (m) return m;
  } catch {
    // fall through
  }
  return `${res.status} ${res.statusText}`;
}

export const api = {
  register: (body: AuthCredentialsDto) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  login: (body: AuthCredentialsDto) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
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
