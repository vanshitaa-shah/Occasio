import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** The authenticated principal attached to the request by JwtAuthGuard. */
export interface AuthedUser {
  userId: string;
  email: string;
}

/** Injects the current authenticated user into a controller handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthedUser => {
    const req = ctx.switchToHttp().getRequest<{ user: AuthedUser }>();
    return req.user;
  },
);
