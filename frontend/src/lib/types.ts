import type { ShapeElement, TextElement } from '@occasio/shared';

/** A partial update applied to a single canvas element (shape or text). */
export type ElementChanges = Partial<ShapeElement> & Partial<TextElement>;

/** The currently selected canvas element, tagged by kind for the panel. */
export type Selection =
  | { type: 'text'; el: TextElement }
  | { type: 'shape'; el: ShapeElement }
  | null;
