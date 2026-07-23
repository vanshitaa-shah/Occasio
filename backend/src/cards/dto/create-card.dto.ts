import { IsEmail, IsISO8601, IsObject } from 'class-validator';
import type { CanvasDesign, CreateCardDto } from '@occasio/shared';

/**
 * Validated request body for POST /cards.
 * `design` is accepted as an opaque object here; deeper canvas-schema
 * validation is a Phase 2 concern once the editor produces real designs.
 */
export class CreateCardBody implements CreateCardDto {
  @IsEmail()
  recipient!: string;

  @IsISO8601()
  sendAt!: string;

  @IsObject()
  design!: CanvasDesign;
}
