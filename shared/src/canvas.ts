/**
 * The serializable description of a card canvas.
 *
 * The frontend (react-konva) PRODUCES this, the backend STORES it verbatim, and
 * the headless render page CONSUMES it to rebuild the exact same scene for the
 * screenshot. It is the single source of truth for what a card looks like — keep
 * it JSON-only (no functions, no class instances) so it round-trips cleanly.
 */

/** Fixed canvas dimensions in px. v1 uses one size; more presets can come later. */
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

/** Built-in theme presets (background of the card). */
export type ThemeId = "sunset" | "ocean" | "forest" | "candy";

export interface Theme {
  id: ThemeId;
  label: string;
  /** Solid or gradient CSS-like background; v1 keeps two solid stops. */
  from: string;
  to: string;
}

export const THEMES: Record<ThemeId, Theme> = {
  sunset: { id: "sunset", label: "Sunset", from: "#ff9a9e", to: "#fad0c4" },
  ocean: { id: "ocean", label: "Ocean", from: "#a1c4fd", to: "#c2e9fb" },
  forest: { id: "forest", label: "Forest", from: "#d4fc79", to: "#96e6a1" },
  candy: { id: "candy", label: "Candy", from: "#fbc2eb", to: "#a6c1ee" },
};

/** The "fun shapes" a user can drop onto the canvas in v1. */
export type ShapeKind = "rect" | "circle" | "star" | "heart";

export interface ShapeElement {
  id: string;
  kind: ShapeKind;
  x: number;
  y: number;
  /** Bounding size used by all shape kinds (radius derived where needed). */
  width: number;
  height: number;
  fill: string;
  rotation?: number;
}

/** Editable text elements — v1 exposes exactly a title and a subtitle. */
export interface TextElement {
  id: string;
  role: "title" | "subtitle";
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fill: string;
  fontStyle?: "normal" | "bold" | "italic";
}

export interface CanvasDesign {
  /** Schema version so stored designs can be migrated later. */
  version: 1;
  width: number;
  height: number;
  theme: ThemeId;
  shapes: ShapeElement[];
  texts: TextElement[];
}

/** A sensible starting design for a fresh editor session. */
export function createDefaultDesign(): CanvasDesign {
  return {
    version: 1,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    theme: "sunset",
    shapes: [],
    texts: [
      {
        id: "title",
        role: "title",
        text: "Happy Birthday!",
        x: CANVAS_WIDTH / 2,
        y: 220,
        fontSize: 56,
        fontFamily: "Georgia, serif",
        fill: "#ffffff",
        fontStyle: "bold",
      },
      {
        id: "subtitle",
        role: "subtitle",
        text: "Wishing you a wonderful day",
        x: CANVAS_WIDTH / 2,
        y: 300,
        fontSize: 28,
        fontFamily: "Georgia, serif",
        fill: "#ffffff",
      },
    ],
  };
}
