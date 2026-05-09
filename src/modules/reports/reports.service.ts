import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async create(planId: string, clerkId: string, dto: CreateReportDto) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan introuvable');

    return this.prisma.report.create({
      data: {
        planId: planId,
        userId: user.id,
        raison: dto.raison,
        description: dto.description,
      },
    });
  }

  async findAll() {
    return this.prisma.report.findMany({
      include: {
        plan: true,
        user: { select: { nom: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
