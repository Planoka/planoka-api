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
        _count: {
          select: {
            plans: true,
            favorites: true,
            boosts: true,
            followers: true,
            following: true,
          },
        },
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

  async getPublicProfile(userId: string, viewerClerkId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nom: true,
        avatarUrl: true,
        ville: true,
        createdAt: true,
        _count: {
          select: {
            plans: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    let isFollowing = false;
    let isOwnProfile = false;

    if (viewerClerkId) {
      const viewer = await this.prisma.user.findUnique({ where: { clerkId: viewerClerkId } });
      if (viewer) {
        isOwnProfile = viewer.id === userId;
        if (!isOwnProfile) {
          const follow = await this.prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: viewer.id, followingId: userId } },
          });
          isFollowing = !!follow;
        }
      }
    }

    return {
      ...user,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      plansCount: user._count.plans,
      isFollowing,
      isOwnProfile,
    };
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
            user: { select: { id: true, nom: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setMyInterests(clerkId: string, categoryIds: string[]) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    await this.prisma.userInterest.deleteMany({ where: { userId: user.id } });

    if (categoryIds && categoryIds.length > 0) {
      await this.prisma.userInterest.createMany({
        data: categoryIds.map((categoryId) => ({ userId: user.id, categorieId: categoryId })),
      });
    }

    return { success: true, message: 'Intérêts mis à jour avec succès' };
  }

  // ── Follow / Unfollow ─────────────────────────────────────────
  async toggleFollow(viewerClerkId: string, targetUserId: string) {
    const viewer = await this.prisma.user.findUnique({ where: { clerkId: viewerClerkId } });
    if (!viewer) throw new NotFoundException('Utilisateur introuvable');

    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('Utilisateur cible introuvable');

    if (viewer.id === targetUserId) {
      throw new NotFoundException('Vous ne pouvez pas vous suivre vous-même');
    }

    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: viewer.id, followingId: targetUserId } },
    });

    if (existing) {
      await this.prisma.follow.delete({ where: { id: existing.id } });
      return { following: false, message: 'Abonnement retiré' };
    } else {
      await this.prisma.follow.create({
        data: { followerId: viewer.id, followingId: targetUserId },
      });
      return { following: true, message: 'Abonné avec succès' };
    }
  }
}
