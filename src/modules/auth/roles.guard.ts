import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY, IS_PUBLIC_KEY } from './roles.decorator';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 0. Si la route est publique, ne pas bloquer
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 1. Récupérer les rôles exigés par le décorateur @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si aucun rôle n'est exigé, on laisse passer
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 2. Récupérer l'utilisateur attaché par l'AuthGuard / ClerkGuard
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    let userRole: Role = user.role;

    // 3. Si le rôle n'a pas encore été chargé (ex: via Clerk où seul clerkId est présent)
    if (!userRole) {
      const dbUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            ...(user.id ? [{ id: user.id }] : []),
            ...(user.clerkId ? [{ clerkId: user.clerkId }] : []),
          ],
        },
        select: { role: true },
      });

      if (!dbUser) {
        throw new ForbiddenException('Utilisateur introuvable dans la base de données');
      }

      userRole = dbUser.role;
    }

    // 4. Vérifier si l'utilisateur possède l'un des rôles exigés
    const hasRole = requiredRoles.includes(userRole);
    if (!hasRole) {
      throw new ForbiddenException("Vous n'avez pas les permissions nécessaires");
    }

    return true;
  }
}
