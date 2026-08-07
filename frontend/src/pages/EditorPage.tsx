import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createDefaultDesign } from '@occasio/shared';
import { CanvasRenderer } from '../components/CanvasRenderer';
import { AppHeader } from '../components/AppHeader';
import { Toolbar } from '../components/Toolbar';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { ScheduleForm } from '../components/ScheduleForm';
import { useCardDesign } from '../hooks/useCardDesign';
import { useCanvasScale } from '../hooks/useCanvasScale';
import { useAuth } from '../hooks/useAuth';
import type { ScheduleEditing } from '../hooks/useScheduleCard';
import { api } from '../lib/api';

export function EditorPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const editId = params.get('edit');

  const {
    design,
    selectedId,
    selection,
    select,
    load,
    setTheme,
    addShape,
    updateElement,
    deleteSelected,
  } = useCardDesign();

  const [editing, setEditing] = useState<ScheduleEditing | null>(null);
  const { ref: canvasAreaRef, scale } = useCanvasScale(design.width, design.height);

  // Load the card to edit (or reset to a fresh design when not editing).
  useEffect(() => {
    if (!editId) {
      setEditing(null);
      load(createDefaultDesign());
      return;
    }
    let cancelled = false;
    api
      .getCard(editId)
      .then((card) => {
        if (cancelled) return;
        load(card.design);
        setEditing({
          id: card.id,
          recipient: card.recipient,
          sendAt: card.sendAt,
        });
      })
      .catch(() => {
        if (!cancelled) navigate('/scheduled');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-900">
      <AppHeader />

      {editing && (
        <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50 px-6 py-2 text-sm text-blue-800">
          <span>
            Editing scheduled card → <strong>{editing.recipient}</strong>
          </span>
          <Link to="/" className="rounded px-2 py-1 text-blue-700 hover:bg-blue-100">
            Start a new card
          </Link>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr_300px] gap-4 p-4">
        <aside className="overflow-y-auto rounded-xl bg-white p-4 shadow-sm">
          <Toolbar theme={design.theme} onThemeChange={setTheme} onAddShape={addShape} />
        </aside>

        {/* Canvas cell: fixed-size design scaled to fit, never scrolls. */}
        <main
          ref={canvasAreaRef}
          className="flex min-h-0 items-center justify-center overflow-hidden rounded-xl bg-white p-4 shadow-sm"
        >
          <div
            className="shadow-lg"
            style={{
              width: design.width * scale,
              height: design.height * scale,
              lineHeight: 0,
            }}
          >
            <CanvasRenderer
              design={design}
              scale={scale}
              interactive
              selectedId={selectedId}
              onSelect={select}
              onChangeElement={updateElement}
            />
          </div>
        </main>

        <aside className="space-y-4 overflow-y-auto">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <PropertiesPanel
              selection={selection}
              onUpdate={updateElement}
              onDelete={deleteSelected}
            />
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-slate-700">
              {editing ? 'Update scheduled card' : 'Schedule'}
            </h2>
            {user && (
              <p className="mb-3 text-xs text-slate-400">
                Sent from {user.email}
              </p>
            )}
            <ScheduleForm
              design={design}
              editing={editing}
              onSaved={() => navigate('/scheduled')}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
