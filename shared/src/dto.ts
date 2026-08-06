import type { CanvasDesign } from "./canvas";

/** Lifecycle of a scheduled card. */
export type CardStatus = "PENDING" | "SENT" | "FAILED";

/** Request body for creating (scheduling) a card. */
export interface CreateCardDto {
  /** Recipient email address. */
  recipient: string;
  /** ISO-8601 timestamp of when to send (UTC). */
  sendAt: string;
  /** The full canvas design to render at send time. */
  design: CanvasDesign;
}

/** Fields that may be edited on a still-PENDING card. */
export interface UpdateCardDto {
  recipient?: string;
  sendAt?: string;
  design?: CanvasDesign;
}

/** A card as returned by the API. */
export interface CardResponse {
  id: string;
  recipient: string;
  sendAt: string;
  status: CardStatus;
  design: CanvasDesign;
  createdAt: string;
  sentAt: string | null;
  error: string | null;
}
