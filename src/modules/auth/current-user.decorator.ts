import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Décorateur pour récupérer facilement l'utilisateur connecté dans les contrôleurs
// Exemple: @CurrentUser() user: { clerkId: string }
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return request.user;
  },
);
