import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from './roles.decorator';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Récupérer les rôles exigés par le décorateur @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si aucun rôle n'est exigé, on laisse passer
    if (!requiredRoles) {
      return true;
    }

    // 2. Récupérer l'utilisateur attaché par le ClerkGuard
    const request = context.switchToHttp().getRequest();
    const user = request.user; // { clerkId: string }

    if (!user || !user.clerkId) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    // 3. Chercher le vrai rôle de l'utilisateur dans notre base de données (Prisma)
    const dbUser = await this.prisma.user.findUnique({
      where: { clerkId: user.clerkId },
      select: { role: true },
    });

    if (!dbUser) {
      throw new ForbiddenException('Utilisateur introuvable dans la base de données');
    }

    // 4. Vérifier si l'utilisateur possède le rôle exigé
    const hasRole = requiredRoles.includes(dbUser.role);
    if (!hasRole) {
      throw new ForbiddenException('Vous n\'avez pas les permissions nécessaires');
    }

    return true;
  }
}
