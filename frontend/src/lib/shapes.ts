import type { ShapeElement, ShapeKind, CanvasDesign } from '@occasio/shared';

/** Heart drawn as an SVG path; these are its intrinsic (pre-scale) dimensions. */
export const HEART_VIEW = { w: 32, h: 29.6 };
export const HEART_PATH =
  'M23.6,0c-3.4,0-6.3,2.7-7.6,5.6C14.7,2.7,11.8,0,8.4,0C3.8,0,0,3.8,0,8.4' +
  'c0,9.4,9.5,11.9,16,21.2c6.1-9.3,16-12.1,16-21.2C32,3.8,28.2,0,23.6,0z';

/** Palette offered for shape fills in the properties panel. */
export const SHAPE_COLORS = [
  '#ffffff',
  '#f43f5e',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#111827',
];

const SHAPE_LABELS: Record<ShapeKind, string> = {
  rect: 'Rectangle',
  circle: 'Circle',
  star: 'Star',
  heart: 'Heart',
};

export function shapeLabel(kind: ShapeKind): string {
  return SHAPE_LABELS[kind];
}

/**
 * Create a new shape centered on the canvas. Every element treats (x, y) as its
 * CENTER so dragging and the transformer behave uniformly across kinds.
 */
export function createShape(kind: ShapeKind, design: CanvasDesign): ShapeElement {
  return {
    id: crypto.randomUUID(),
    kind,
    x: design.width / 2,
    y: design.height / 2,
    width: 120,
    height: 120,
    fill: kind === 'rect' ? '#3b82f6' : '#f43f5e',
    rotation: 0,
  };
}
