import { Controller, Post } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser } from './current-user.decorator';
import { createClerkClient } from '@clerk/backend';

@Controller('auth')
export class AuthController {
  constructor(private prisma: PrismaService) {}

  @Post('sync')
  async syncUser(@CurrentUser() user: { clerkId: string }) {
    const existing = await this.prisma.user.findUnique({
      where: { clerkId: user.clerkId },
    });

    if (existing) return existing;

    // Récupérer les vraies données de l'utilisateur depuis Clerk
    let nom = 'Utilisateur';
    let email = `user_${user.clerkId}@planoka.com`;
    let avatarUrl: string | null = null;

    try {
      const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      const clerkUser = await clerkClient.users.getUser(user.clerkId);
      const firstName = clerkUser.firstName || '';
      const lastName = clerkUser.lastName || '';
      nom = `${firstName} ${lastName}`.trim() || clerkUser.username || 'Utilisateur';
      email = clerkUser.emailAddresses?.[0]?.emailAddress || email;
      avatarUrl = clerkUser.imageUrl || null;
    } catch (err) {
      console.error('Clerk user fetch failed during sync:', err);
      // Continuer avec les valeurs par défaut si Clerk n'est pas accessible
    }

    return this.prisma.user.create({
      data: {
        clerkId: user.clerkId,
        nom,
        email,
        avatarUrl,
        role: 'USER',
      },
    });
  }
}
