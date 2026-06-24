import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMyProfile(clerkId: string) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      include: {
        interests: { include: { categorie: true } },
        _count: { select: { plans: true, favorites: true, boosts: true } },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async updateProfile(clerkId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    return this.prisma.user.update({
      where: { id: user.id },
      data: dto,
    });
  }

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nom: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: { plans: true, boosts: true }
        },
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user;
  }

  async getMyFavorites(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    return this.prisma.favorite.findMany({
      where: { userId: user.id },
      include: {
        plan: {
          include: {
            categories: true,
            user: { select: { id: true, nom: true, avatarUrl: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setMyInterests(clerkId: string, categoryIds: string[]) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // 1. Supprimer les anciens intérêts
    await this.prisma.userInterest.deleteMany({
      where: { userId: user.id }
    });

    // 2. Ajouter les nouveaux intérêts si fournis
    if (categoryIds && categoryIds.length > 0) {
      const interestsData = categoryIds.map((categoryId) => ({
        userId: user.id,
        categorieId: categoryId,
      }));
      await this.prisma.userInterest.createMany({
        data: interestsData,
      });
    }

    return { success: true, message: 'Intérêts mis à jour avec succès' };
  }
}
