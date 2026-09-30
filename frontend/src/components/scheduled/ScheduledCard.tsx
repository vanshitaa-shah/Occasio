import { useNavigate } from 'react-router-dom';
import type { CardResponse } from '@occasio/shared';
import { CanvasRenderer } from '../CanvasRenderer';
import { StatusBadge } from './StatusBadge';
import { formatWhen } from '../../lib/datetime';
import { useAuth } from '../../hooks/useAuth';

const PREVIEW_WIDTH = 260;

interface ScheduledCardProps {
  card: CardResponse;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}

export function ScheduledCard({ card, onCancel, onRetry }: ScheduledCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const scale = PREVIEW_WIDTH / card.design.width;
  const isPending = card.status === 'PENDING';
  const isFailed = card.status === 'FAILED';
  const isSending = card.status === 'SENDING';

  const confirmCancel = () => {
    const label = isPending ? 'Cancel this scheduled card?' : 'Remove this card?';
    if (window.confirm(label)) onCancel(card.id);
  };

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      {/* Preview thumbnail (same renderer as editor/email) */}
      <div
        className="bg-slate-50"
        style={{ width: PREVIEW_WIDTH, height: card.design.height * scale }}
      >
        <CanvasRenderer design={card.design} scale={scale} sentBy={user?.email} />
      </div>

      <div className="space-y-2 p-3" style={{ width: PREVIEW_WIDTH }}>
        <div className="flex items-center justify-between">
          <StatusBadge status={card.status} />
          <span className="truncate text-xs text-slate-500" title={card.recipient}>
            {card.recipient}
          </span>
        </div>

        <p className="text-xs text-slate-600">{formatWhen(card.sendAt)}</p>

        {isFailed && card.error && (
          <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-600">
            {card.error}
            {card.attempts > 0 && (
              <span className="block text-red-400">
                after {card.attempts} attempt{card.attempts === 1 ? '' : 's'}
              </span>
            )}
          </p>
        )}

        {/* A card mid-send can't be edited or cancelled. */}
        {isSending ? (
          <p className="text-xs text-blue-600">Sending now…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {isPending && (
              <button
                type="button"
                onClick={() => navigate(`/?edit=${card.id}`)}
                className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                Edit
              </button>
            )}
            {isFailed && (
              <button
                type="button"
                onClick={() => onRetry(card.id)}
                className="rounded border border-blue-200 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
              >
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={confirmCancel}
              className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              {isPending ? 'Cancel' : 'Remove'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
