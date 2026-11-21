import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { verifyToken } from '@clerk/backend';

@Injectable()
export class ClerkGuard implements CanActivate {
  private readonly logger = new Logger(ClerkGuard.name);

  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Vérifier si la route a le décorateur @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si la route est publique, on laisse passer tout le monde
    if (isPublic) {
      return true;
    }

    // 2. Extraire le token Bearer de la requête HTTP
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Non autorisé : Token manquant');
    }

    const token = authHeader.split(' ')[1];

    // 3. Tenter de valider le token comme JWT local (Admin ou utilisateur direct)
    try {
      const jwtSecret =
        this.configService.get<string>('JWT_SECRET') ||
        'planoka-default-secret-key-change-in-production-2025';
      const payload = await this.jwtService.verifyAsync(token, { secret: jwtSecret });

      if (payload && (payload.sub || payload.id)) {
        const userId = payload.sub || payload.id;
        const dbUser = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            clerkId: true,
            nom: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        });

        if (!dbUser) {
          throw new UnauthorizedException('Utilisateur introuvable ou session révoquée');
        }

        request.user = {
          id: dbUser.id,
          clerkId: dbUser.clerkId || dbUser.id,
          nom: dbUser.nom,
          email: dbUser.email,
          role: dbUser.role,
          avatarUrl: dbUser.avatarUrl,
        };
        return true;
      }
    } catch {
      // Ce n'était pas un JWT local valide, continuer vers la vérification Clerk
    }

    // 4. Vérifier la validité du token avec Clerk
    try {
      const clerkSecretKey = this.configService.get<string>('CLERK_SECRET_KEY');
      if (clerkSecretKey) {
        const payload = await verifyToken(token, {
          secretKey: clerkSecretKey,
        });

        // On attache l'ID Clerk de l'utilisateur à la requête pour le récupérer plus tard
        request.user = { clerkId: payload.sub };
        return true;
      }
    } catch {
      // Échec Clerk
    }

    throw new UnauthorizedException('Non autorisé : Token invalide ou expiré');
  }
}
