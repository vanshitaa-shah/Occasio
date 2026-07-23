import type { TextElement } from '@occasio/shared';
import { Swatches } from './Swatches';

interface TextEditorProps {
  el: TextElement;
  onChange: (changes: Partial<TextElement>) => void;
}

/** Editor for the selected text element (content, size, color, weight). */
export function TextEditor({ el, onChange }: TextEditorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {el.role}
      </h3>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Text</span>
        <textarea
          value={el.text}
          onChange={(e) => onChange({ text: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Font size: {el.fontSize}px</span>
        <input
          type="range"
          min={12}
          max={96}
          value={el.fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          className="w-full"
        />
      </label>

      <div className="text-sm">
        <span className="mb-1 block text-slate-600">Color</span>
        <Swatches value={el.fill} onChange={(fill) => onChange({ fill })} />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={el.fontStyle === 'bold'}
          onChange={(e) =>
            onChange({ fontStyle: e.target.checked ? 'bold' : 'normal' })
          }
        />
        Bold
      </label>
    </div>
  );
}
