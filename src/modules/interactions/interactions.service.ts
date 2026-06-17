import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InteractionsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Ajoute ou retire un plan des favoris (Toggle)
   */
  async toggleFavorite(planId: string, clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan introuvable');

    const existing = await this.prisma.favorite.findUnique({
      where: { userId_planId: { userId: user.id, planId: planId } },
    });

    if (existing) {
      await this.prisma.favorite.delete({
        where: { id: existing.id },
      });
      return { favorited: false };
    } else {
      await this.prisma.favorite.create({
        data: { userId: user.id, planId: planId },
      });
      return { favorited: true };
    }
  }

  /**
   * Boost un plan ou retire le boost (Toggle)
   * Met à jour le compteur boostsCount dans la table Plan pour les perfs de tri
   */
  async toggleBoost(planId: string, clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: { user: true },
    });
    if (!plan) throw new NotFoundException('Plan introuvable');

    const existing = await this.prisma.boost.findUnique({
      where: { planId_userId: { planId: planId, userId: user.id } },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.boost.delete({ where: { id: existing.id } }),
        this.prisma.plan.update({
          where: { id: planId },
          data: { boostsCount: { decrement: 1 } },
        }),
      ]);
      return { boosted: false };
    } else {
      await this.prisma.$transaction([
        this.prisma.boost.create({ data: { userId: user.id, planId: planId } }),
        this.prisma.plan.update({
          where: { id: planId },
          data: { boostsCount: { increment: 1 } },
        }),
      ]);

      // Envoyer une notification push au propriétaire du plan si ce n'est pas lui-même
      if (plan.userId !== user.id) {
        const planOwner = plan.user;
        if (planOwner.pushToken) {
          await this.notifications.sendPushNotification(
            planOwner.pushToken,
            'Nouveau Boost ! 🚀',
            `${user.nom} a boosté votre plan "${plan.titre}"`,
            { planId: plan.id },
          );
        }
      }

      return { boosted: true };
    }
  }

  /**
   * Incrémente le compteur de partages d'un plan
   */
  async recordShare(planId: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan introuvable');

    await this.prisma.plan.update({
      where: { id: planId },
      data: { sharesCount: { increment: 1 } },
    });

    return { success: true };
  }
}
