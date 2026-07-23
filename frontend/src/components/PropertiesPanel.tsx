import type { ElementChanges, Selection } from '../lib/types';
import { TextEditor } from './panel/TextEditor';
import { ShapeEditor } from './panel/ShapeEditor';

interface PropertiesPanelProps {
  selection: Selection;
  onUpdate: (id: string, changes: ElementChanges) => void;
  onDelete: (id: string) => void;
}

/** Shows the editor for whatever element is selected (or a hint if none). */
export function PropertiesPanel({
  selection,
  onUpdate,
  onDelete,
}: PropertiesPanelProps) {
  if (!selection) {
    return (
      <p className="text-sm text-slate-400">
        Select an element on the canvas to edit it.
      </p>
    );
  }

  if (selection.type === 'text') {
    const el = selection.el;
    return (
      <TextEditor el={el} onChange={(changes) => onUpdate(el.id, changes)} />
    );
  }

  const el = selection.el;
  return (
    <ShapeEditor
      el={el}
      onChange={(changes) => onUpdate(el.id, changes)}
      onDelete={() => onDelete(el.id)}
    />
  );
}
