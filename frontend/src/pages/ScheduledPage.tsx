import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { ScheduledCard } from '../components/scheduled/ScheduledCard';
import { useScheduledCards } from '../hooks/useScheduledCards';

export function ScheduledPage() {
  const { cards, loading, error, refresh, cancel, retry } = useScheduledCards();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />

      <main className="mx-auto max-w-[1400px] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Scheduled cards {cards.length > 0 && `(${cards.length})`}
          </h2>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {loading && <p className="text-sm text-slate-500">Loading…</p>}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && cards.length === 0 && (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-slate-500">No cards scheduled yet.</p>
            <Link
              to="/"
              className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Design a card
            </Link>
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          {cards.map((card) => (
            <ScheduledCard
              key={card.id}
              card={card}
              onCancel={cancel}
              onRetry={retry}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
