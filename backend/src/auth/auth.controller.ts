import { Body, Controller, Post } from '@nestjs/common';
import type { AuthResponse } from '@occasio/shared';
import { AuthService } from './auth.service';
import { AuthCredentialsBody } from './dto/auth-credentials.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() body: AuthCredentialsBody): Promise<AuthResponse> {
    return this.auth.register(body);
  }

  @Post('login')
  login(@Body() body: AuthCredentialsBody): Promise<AuthResponse> {
    return this.auth.login(body);
  }
}
