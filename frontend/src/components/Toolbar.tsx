import type { ShapeKind, ThemeId } from '@occasio/shared';
import { THEMES } from '@occasio/shared';
import { shapeLabel } from '../lib/shapes';

const SHAPE_KINDS: ShapeKind[] = ['rect', 'circle', 'star', 'heart'];

interface ToolbarProps {
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  onAddShape: (kind: ShapeKind) => void;
}

export function Toolbar({ theme, onThemeChange, onAddShape }: ToolbarProps) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Theme
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(THEMES).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onThemeChange(t.id)}
              className={`rounded-lg border p-1 text-left text-sm transition ${
                theme === t.id
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span
                className="block h-8 w-full rounded-sm"
                style={{
                  background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                }}
              />
              <span className="mt-1 block px-1 text-xs text-slate-600">
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Add shape
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {SHAPE_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => onAddShape(kind)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {shapeLabel(kind)}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
