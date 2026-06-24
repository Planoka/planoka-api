import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    categoryId?: string;
    ville?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.categoryId) {
      where.categories = {
        some: {
          id: query.categoryId,
        },
      };
    }
    if (query.ville) {
      where.ville = { contains: query.ville, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.plan.findMany({
        where,
        include: {
          categories: true,
          user: { select: { id: true, nom: true, avatarUrl: true } },
          _count: { select: { favorites: true, comments: true, boosts: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.plan.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async create(clerkId: string, dto: CreatePlanDto) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    if (dto.images && dto.images.length > 0 && dto.videoUrl) {
      throw new BadRequestException('Un plan ne peut pas avoir à la fois des images et une vidéo');
    }

    return this.prisma.plan.create({
      data: {
        titre: dto.titre,
        description: dto.description,
        ville: dto.ville,
        images: dto.images || [],
        videoUrl: dto.videoUrl || null,
        userId: user.id,
        categories: {
          connect: dto.categoryIds.map(id => ({ id })),
        },
      },
      include: {
        categories: true,
        user: { select: { nom: true, avatarUrl: true } },
      },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        categories: true,
        user: { select: { id: true, nom: true, avatarUrl: true } },
        _count: { select: { favorites: true, comments: true, boosts: true } },
      },
    });

    if (!plan) throw new NotFoundException('Plan introuvable');
    return plan;
  }

  async update(id: string, clerkId: string, dto: UpdatePlanDto) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan introuvable');

    if (plan.userId !== user.id) {
      throw new ForbiddenException('Vous n\'êtes pas l\'auteur de ce plan');
    }

    if (dto.images && dto.images.length > 0 && dto.videoUrl) {
      throw new BadRequestException('Un plan ne peut pas avoir à la fois des images et une vidéo');
    }

    const updateData: any = {
      titre: dto.titre,
      description: dto.description,
      ville: dto.ville,
      images: dto.images,
      videoUrl: dto.videoUrl,
    };

    if (dto.categoryIds) {
      updateData.categories = {
        set: dto.categoryIds.map(id => ({ id })),
      };
    }

    return this.prisma.plan.update({
      where: { id },
      data: updateData,
      include: { categories: true },
    });
  }

  async remove(id: string, clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan introuvable');
    
    // Autoriser la suppression si c'est l'auteur ou un admin
    if (plan.userId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Vous n\'avez pas les droits pour supprimer ce plan');
    }

    await this.prisma.plan.delete({ where: { id } });
    return { success: true, message: 'Plan supprimé avec succès' };
  }
}
