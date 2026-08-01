import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string) {
    if (!query) return { users: [], plans: [], cities: [], categories: [] };

    const contains = { contains: query, mode: 'insensitive' as const };
    const [users, plans, categories, cityRows] = await Promise.all([
      this.prisma.user.findMany({
        where: { OR: [{ nom: contains }, { email: contains }] },
        select: { id: true, nom: true, email: true, avatarUrl: true },
        take: 10,
      }),
      this.prisma.plan.findMany({
        where: { OR: [{ titre: contains }, { description: contains }, { ville: contains }] },
        include: { categories: true, user: { select: { id: true, nom: true, avatarUrl: true } }, _count: { select: { favorites: true, comments: true, boosts: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.category.findMany({
        where: { OR: [{ nomFr: contains }, { nomEn: contains }, { slug: contains }] },
        take: 10,
      }),
      this.prisma.plan.findMany({
        where: { ville: contains },
        select: { ville: true },
        distinct: ['ville'],
        take: 10,
      }),
    ]);

    return {
      users,
      plans,
      categories,
      cities: cityRows.map((row) => row.ville),
    };
  }
}
