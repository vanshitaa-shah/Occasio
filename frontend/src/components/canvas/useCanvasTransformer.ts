import { useEffect, useRef } from 'react';
import type Konva from 'konva';
import type { CanvasDesign } from '@occasio/shared';

/**
 * Tracks Konva node refs by element id and attaches the transformer to the
 * selected shape (texts are moved, not resized). Returns a `register(id)` ref
 * callback for elements plus the transformer ref for the <Transformer />.
 */
export function useCanvasTransformer(
  design: CanvasDesign,
  selectedId: string | null,
) {
  const trRef = useRef<Konva.Transformer>(null);
  const nodes = useRef<Record<string, Konva.Node>>({});

  const register = (id: string) => (node: Konva.Node | null) => {
    if (node) nodes.current[id] = node;
    else delete nodes.current[id];
  };

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = selectedId ? nodes.current[selectedId] : null;
    const isShape = design.shapes.some((s) => s.id === selectedId);
    tr.nodes(node && isShape ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, design]);

  return { trRef, register };
}
