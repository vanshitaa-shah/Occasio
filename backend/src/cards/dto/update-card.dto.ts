import { IsEmail, IsISO8601, IsObject, IsOptional } from 'class-validator';
import type { CanvasDesign, UpdateCardDto } from '@occasio/shared';

/** Validated body for PATCH /cards/:id — all fields optional. */
export class UpdateCardBody implements UpdateCardDto {
  @IsOptional()
  @IsEmail()
  recipient?: string;

  @IsOptional()
  @IsISO8601()
  sendAt?: string;

  @IsOptional()
  @IsObject()
  design?: CanvasDesign;
}
