import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  private cityCoordinates(ville: string) {
    const cities: Record<string, { lat: number; lng: number }> = {
      yaounde: { lat: 3.848, lng: 11.5021 }, douala: { lat: 4.0511, lng: 9.7679 },
      buea: { lat: 4.156, lng: 9.2413 }, kribi: { lat: 2.9355, lng: 9.9079 },
      limbe: { lat: 4.0205, lng: 9.1932 }, bafoussam: { lat: 5.4781, lng: 10.4174 },
      garoua: { lat: 9.3014, lng: 13.3977 }, bertoua: { lat: 4.5773, lng: 13.6846 },
    };
    const key = ville.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const base = cities[key] || { lat: 3.848, lng: 11.5021 };
    return base;
  }

  private cityFallback(ville: string, seed: string) {
    const base = this.cityCoordinates(ville);
    let hash = 0;
    for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    const latOffset = (((hash % 1000) / 1000) - 0.5) * 0.06;
    const lngOffset = ((((hash >> 8) % 1000) / 1000) - 0.5) * 0.06;
    return { latitude: base.lat + latOffset, longitude: base.lng + lngOffset };
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    categoryId?: string;
    ville?: string;
    userId?: string;
    favoritedBy?: string;
    boostedBy?: string;
    search?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.categoryId) {
      where.categories = { some: { OR: [{ id: query.categoryId }, { slug: query.categoryId }] } };
    }
    if (query.ville) {
      where.ville = { contains: query.ville, mode: 'insensitive' };
    }
    if (query.search) {
      where.OR = [
        { titre: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { ville: { contains: query.search, mode: 'insensitive' } },
        { categories: { some: { OR: [
          { nomFr: { contains: query.search, mode: 'insensitive' } },
          { nomEn: { contains: query.search, mode: 'insensitive' } },
        ] } } },
      ];
    }

    // Plans créés par un utilisateur spécifique (profil)
    if (query.userId) {
      where.userId = query.userId;
    }

    // Plans mis en favoris par un utilisateur
    if (query.favoritedBy) {
      where.favorites = { some: { userId: query.favoritedBy } };
    }

    // Plans boostés par un utilisateur
    if (query.boostedBy) {
      where.boosts = { some: { userId: query.boostedBy } };
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

    const fallback = dto.latitude === undefined || dto.longitude === undefined
      ? this.cityFallback(dto.ville, `${dto.titre}:${dto.ville}`)
      : null;

    return this.prisma.plan.create({
      data: {
        titre: dto.titre,
        description: dto.description,
        ville: dto.ville,
        latitude: dto.latitude ?? fallback?.latitude,
        longitude: dto.longitude ?? fallback?.longitude,
        locationSource: dto.latitude !== undefined && dto.longitude !== undefined ? 'GPS' : 'CITY',
        images: dto.images || [],
        videoUrl: dto.videoUrl || null,
        userId: user.id,
        categories: {
          connect: dto.categoryIds.map(id => ({ id })),
        },
      },
      include: {
        categories: true,
        user: { select: { id: true, nom: true, avatarUrl: true } },
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
      latitude: dto.latitude,
      longitude: dto.longitude,
      locationSource: dto.latitude !== undefined && dto.longitude !== undefined ? 'GPS' : undefined,
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
    
    if (plan.userId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Vous n\'avez pas les droits pour supprimer ce plan');
    }

    await this.prisma.plan.delete({ where: { id } });
    return { success: true, message: 'Plan supprimé avec succès' };
  }

  async mapSearch(query: { q?: string; ville?: string; categoryId?: string; page?: number; limit?: number }) {
    const result = await this.findAll({
      page: query.page,
      limit: query.limit || 100,
      ville: query.ville,
      categoryId: query.categoryId,
      search: query.q,
    });
    return { ...result, plans: result.data };
  }
}
