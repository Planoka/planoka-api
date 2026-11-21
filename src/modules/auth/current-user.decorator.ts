import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

export class AuthenticatedUser {
  id: string;
  clerkId?: string | null;
  email: string;
  role: Role;
  nom?: string;
  avatarUrl?: string | null;
}

// Décorateur pour récupérer facilement l'utilisateur connecté dans les contrôleurs
// Exemple: @CurrentUser() user: AuthenticatedUser
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return request.user;
  },
);
