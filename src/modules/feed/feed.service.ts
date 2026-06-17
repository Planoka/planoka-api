import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

const FEED_CACHE_TTL = 600; // 10 minutes (roadmap)

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Feed recommandé pour un utilisateur connecté.
   * Score = fraîcheur (30j) + popularité comportementale + pertinence intérêts + bonus géographique
   */
  async getRecommended(clerkId: string) {
    const cacheKey = `feed:recommended:${clerkId}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    // 1. Récupérer l'utilisateur et ses intérêts
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      include: { interests: true },
    });

    const categoryIds = user?.interests.map((i) => i.categorieId) ?? [];
    const userVille = user?.ville ?? null;

    // 2. Récupérer les 100 plans actifs des 30 derniers jours
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const plans = await this.prisma.plan.findMany({
      where: { status: 'ACTIVE', createdAt: { gte: since30d } },
      take: 100,
      include: {
        categorie: true,
        user: { select: { nom: true, avatarUrl: true } },
        _count: { select: { favorites: true, comments: true, boosts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Calculer le score pour chaque plan
    const scoredPlans = plans.map((plan) => {
      const now = Date.now();
      const ageInDays = (now - plan.createdAt.getTime()) / (1000 * 60 * 60 * 24);

      // Fraîcheur : décrement progressif sur 30 jours (0-30 pts)
      const freshness = Math.max(0, 30 - ageInDays);

      // Popularité comportementale pondérée (0-40 pts)
      const counts = (plan as any)._count;
      const popularity = Math.min(
        40,
        (counts?.favorites || 0) * 5 +  // fav x5
        (counts?.boosts || 0) * 4 +      // boost x4
        (counts?.comments || 0) * 1,     // view/comment x1
      );

      // Pertinence intérêts (0-20 pts)
      const hasInterest = categoryIds.includes((plan as any).categorieId);
      const relevance = hasInterest ? 20 : 0;

      // Bonus géographique +20% si même ville
      const geoBonus =
        userVille &&
        (plan as any).ville &&
        (plan as any).ville.toLowerCase() === userVille.toLowerCase()
          ? 0.2
          : 0;

      const baseScore = freshness + popularity + relevance;
      const finalScore = Math.round(baseScore * (1 + geoBonus));

      return { ...plan, score: finalScore };
    });

    // 4. Trier et retourner les 20 meilleurs
    const result = scoredPlans.sort((a, b) => b.score - a.score).slice(0, 20);

    await this.redis.set(cacheKey, result, FEED_CACHE_TTL);
    return result;
  }

  /**
   * Fallback pour visiteurs non connectés : top boosts de la semaine.
   */
  async getTopWeekly() {
    const cacheKey = 'feed:top_weekly';

    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const plans = await this.prisma.plan.findMany({
      where: { status: 'ACTIVE', createdAt: { gte: since7d } },
      take: 20,
      include: {
        categorie: true,
        user: { select: { nom: true, avatarUrl: true } },
        _count: { select: { favorites: true, comments: true, boosts: true } },
      },
      orderBy: { boostsCount: 'desc' },
    });

    await this.redis.set(cacheKey, plans, FEED_CACHE_TTL);
    return plans;
  }
}
