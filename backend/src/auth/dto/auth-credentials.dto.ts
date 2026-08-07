import { IsEmail, IsString, MinLength } from 'class-validator';
import type { AuthCredentialsDto } from '@occasio/shared';

/** Validated body for POST /auth/register and /auth/login. */
export class AuthCredentialsBody implements AuthCredentialsDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;
}
