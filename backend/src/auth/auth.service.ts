import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { AuthResponse } from '@occasio/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuthCredentialsBody } from './dto/auth-credentials.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register({ email, password }: AuthCredentialsBody): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');
    const user = await this.prisma.user.create({
      data: { email, passwordHash: await bcrypt.hash(password, 10) },
    });
    return this.sign(user.id, user.email);
  }

  async login({ email, password }: AuthCredentialsBody): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.sign(user.id, user.email);
  }

  private sign(id: string, email: string): AuthResponse {
    const token = this.jwt.sign({ sub: id, email });
    return { token, user: { id, email } };
  }
}
