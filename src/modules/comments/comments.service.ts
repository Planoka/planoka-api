import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async create(planId: string, clerkId: string, dto: CreateCommentDto) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan introuvable');

    // On utilise une transaction pour garantir que le compteur du plan est mis à jour
    const [comment] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: {
          contenu: dto.contenu,
          planId: planId,
          userId: user.id,
          parentId: dto.parentId,
        },
        include: { user: { select: { nom: true, avatarUrl: true } } },
      }),
      this.prisma.plan.update({
        where: { id: planId },
        data: { commentsCount: { increment: 1 } },
      }),
    ]);

    return comment;
  }

  async findByPlan(planId: string) {
    return this.prisma.comment.findMany({
      where: { planId },
      include: {
        user: { select: { nom: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
