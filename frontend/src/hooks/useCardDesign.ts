import { useMemo, useState } from 'react';
import type {
  CanvasDesign,
  ShapeElement,
  ShapeKind,
  TextElement,
  ThemeId,
} from '@occasio/shared';
import { createDefaultDesign } from '@occasio/shared';
import { createShape } from '../lib/shapes';
import type { ElementChanges, Selection } from '../lib/types';

/**
 * Owns the editable card design and all mutations, so pages/components stay
 * presentational. Elements are looked up by id across both `shapes` and
 * `texts`, so a single `updateElement` covers panel edits and canvas
 * drag/transform alike.
 */
export function useCardDesign() {
  const [design, setDesign] = useState<CanvasDesign>(() => createDefaultDesign());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selection = useMemo<Selection>(() => {
    if (!selectedId) return null;
    const text = design.texts.find((t) => t.id === selectedId);
    if (text) return { type: 'text', el: text };
    const shape = design.shapes.find((s) => s.id === selectedId);
    if (shape) return { type: 'shape', el: shape };
    return null;
  }, [design, selectedId]);

  /** Replace the whole working design (e.g. when loading a card to edit). */
  const load = (next: CanvasDesign) => {
    setDesign(next);
    setSelectedId(null);
  };

  const setTheme = (theme: ThemeId) => setDesign((d) => ({ ...d, theme }));

  const addShape = (kind: ShapeKind) => {
    const shape = createShape(kind, design);
    setDesign((d) => ({ ...d, shapes: [...d.shapes, shape] }));
    setSelectedId(shape.id);
  };

  const updateElement = (id: string, changes: ElementChanges) =>
    setDesign((d) => ({
      ...d,
      shapes: d.shapes.map((s) =>
        s.id === id ? ({ ...s, ...changes } as ShapeElement) : s,
      ),
      texts: d.texts.map((t) =>
        t.id === id ? ({ ...t, ...changes } as TextElement) : t,
      ),
    }));

  const deleteSelected = (id: string) => {
    setDesign((d) => ({ ...d, shapes: d.shapes.filter((s) => s.id !== id) }));
    setSelectedId(null);
  };

  return {
    design,
    selectedId,
    selection,
    select: setSelectedId,
    load,
    setTheme,
    addShape,
    updateElement,
    deleteSelected,
  };
}
