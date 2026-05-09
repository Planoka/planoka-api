import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './roles.decorator';
import { verifyToken } from '@clerk/backend';

@Injectable()
export class ClerkGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

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

    // 3. Vérifier la validité du token avec Clerk
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      
      // On attache l'ID Clerk de l'utilisateur à la requête pour le récupérer plus tard
      request.user = { clerkId: payload.sub };
      return true;
      
    } catch (error) {
      throw new UnauthorizedException('Non autorisé : Token invalide ou expiré');
    }
  }
}
