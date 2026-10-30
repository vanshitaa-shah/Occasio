import type { CanvasDesign } from "./canvas";

/** Lifecycle of a scheduled card. `SENDING` = a worker has claimed it and is
 * rendering/mailing it right now (transient; guards against double-send). */
export type CardStatus = "PENDING" | "SENDING" | "SENT" | "FAILED";

/** Credentials for register / login. */
export interface AuthCredentialsDto {
  email: string;
  password: string;
}

/** The authenticated user (never includes the password hash). */
export interface AuthUser {
  id: string;
  email: string;
}

/** Response from register / login: a bearer token plus the user. */
export interface AuthResponse {
  token: string;
  user: AuthUser;
}

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
  /** Number of send attempts made so far (increments each worker pickup). */
  attempts: number;
}

export const DEMO_RECIPIENT = "friend@yopmail.com";
