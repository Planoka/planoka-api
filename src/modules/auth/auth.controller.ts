import { Controller, Post } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private prisma: PrismaService) {}

  @Post('sync')
  async syncUser(@CurrentUser() user: { clerkId: string }) {
    // Note : Dans un cas réel, on utiliserait le clerkClient pour récupérer l'email/nom
    // Mais ici, on va simplifier : si l'utilisateur n'existe pas, on le crée avec des infos temporaires
    // ou on attend que le frontend nous envoie les infos complètes.
    
    const existing = await this.prisma.user.findUnique({
      where: { clerkId: user.clerkId },
    });

    if (existing) return existing;

    // Création par défaut (l'utilisateur devra mettre à jour son profil ensuite)
    return this.prisma.user.create({
      data: {
        clerkId: user.clerkId,
        nom: 'Nouvel Utilisateur',
        email: `user_${user.clerkId}@planoka.com`, // Email temporaire
        role: 'USER',
      },
    });
  }
}
