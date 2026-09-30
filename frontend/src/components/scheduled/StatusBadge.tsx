import type { CardStatus } from '@occasio/shared';

const STYLES: Record<CardStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  SENDING: 'bg-blue-100 text-blue-700',
  SENT: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

const LABELS: Record<CardStatus, string> = {
  PENDING: 'PENDING',
  SENDING: 'SENDING…',
  SENT: 'SENT',
  FAILED: 'FAILED',
};

export function StatusBadge({ status }: { status: CardStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
