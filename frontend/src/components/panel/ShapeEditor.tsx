import type { ShapeElement } from '@occasio/shared';
import { shapeLabel } from '../../lib/shapes';
import { Swatches } from './Swatches';

interface ShapeEditorProps {
  el: ShapeElement;
  onChange: (changes: Partial<ShapeElement>) => void;
  onDelete: () => void;
}

/** Editor for the selected shape (size, color, delete). */
export function ShapeEditor({ el, onChange, onDelete }: ShapeEditorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {shapeLabel(el.kind)}
      </h3>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">
          Size: {Math.round(el.width)}px
        </span>
        <input
          type="range"
          min={20}
          max={400}
          value={el.width}
          onChange={(e) => {
            const size = Number(e.target.value);
            onChange({ width: size, height: size });
          }}
          className="w-full"
        />
      </label>

      <div className="text-sm">
        <span className="mb-1 block text-slate-600">Color</span>
        <Swatches value={el.fill} onChange={(fill) => onChange({ fill })} />
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
      >
        Delete shape
      </button>
    </div>
  );
}
