import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(planId: string, clerkId: string, dto: CreateCommentDto) {
    const user = await this.prisma.findUserByIdOrClerkId(clerkId);
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: { user: true },
    });
    if (!plan) throw new NotFoundException('Plan introuvable');

    const [comment] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: { contenu: dto.contenu, planId, userId: user.id, parentId: dto.parentId },
        include: { user: { select: { nom: true, avatarUrl: true } } },
      }),
      this.prisma.plan.update({
        where: { id: planId },
        data: { commentsCount: { increment: 1 } },
      }),
    ]);

    // Envoyer une notification à l'auteur du plan s'il est différent de l'auteur du commentaire
    if (plan.userId !== user.id) {
      const planOwner = plan.user;
      const notificationTitle = 'Nouveau commentaire 💬';
      const notificationBody = `${user.nom} a commenté votre plan "${plan.titre}"`;

      // Envoi Push
      if (planOwner.pushToken) {
        await this.notifications.sendPushNotification(
          planOwner.pushToken,
          notificationTitle,
          notificationBody,
          { planId: plan.id },
        );
      }

      // Envoi Email
      if (planOwner.email) {
        const emailHtml = `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Bonjour ${planOwner.nom},</h2>
            <p><strong>${user.nom}</strong> a laissé un commentaire sur votre plan <strong>${plan.titre}</strong> :</p>
            <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #FF6B35; margin: 15px 0;">
              "${dto.contenu}"
            </blockquote>
            <p>Pour y répondre, ouvrez l'application Planoka.</p>
            <br />
            <p>L'équipe Planoka</p>
          </div>
        `;
        await this.notifications.sendEmail(
          planOwner.email,
          `Nouveau commentaire sur votre plan "${plan.titre}"`,
          emailHtml,
        );
      }
    }

    return comment;
  }

  async findByPlan(planId: string) {
    return this.prisma.comment.findMany({
      where: { planId },
      include: { user: { select: { nom: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(commentId: string, clerkId: string) {
    const user = await this.prisma.findUserByIdOrClerkId(clerkId);
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Commentaire introuvable');

    // Seul l'auteur ou un admin peut supprimer
    if (comment.userId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Vous ne pouvez pas supprimer ce commentaire');
    }

    // Décrémenter le compteur du plan en même temps
    await this.prisma.$transaction([
      this.prisma.comment.delete({ where: { id: commentId } }),
      this.prisma.plan.update({
        where: { id: comment.planId },
        data: { commentsCount: { decrement: 1 } },
      }),
    ]);

    return { success: true, message: 'Commentaire supprimé' };
  }
}
