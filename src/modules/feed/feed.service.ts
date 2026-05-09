import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

const FEED_CACHE_TTL = 300; // 5 minutes de cache

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Algorithme de recommandation simple :
   * score = fraîcheur (40%) + popularité (30%) + pertinence/intérêts (30%)
   */
  async getRecommended(clerkId: string) {
    const cacheKey = `feed:recommended:${clerkId}`;

    // Vérifier le cache Redis
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cached = await this.redis.get(cacheKey);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    if (cached) return cached;

    // 1. Récupérer les intérêts de l'utilisateur
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      include: { interests: true },
    });

    const categoryIds = user?.interests.map((i) => i.categorieId) || [];

    // 2. Récupérer les 50 plans les plus récents pour le calcul
    const plans = await this.prisma.plan.findMany({
      take: 50,
      include: {
        categorie: true,
        user: { select: { nom: true, avatarUrl: true } },
        _count: { select: { favorites: true, comments: true, boosts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Calculer le score pour chaque plan
    const scoredPlans = plans.map((plan) => {
      // Fraîcheur (0-40) : perd 0.5 point par heure
      const now = new Date().getTime();
      const planTime = plan.createdAt.getTime();
      const ageInHours = (now - planTime) / (1000 * 60 * 60);
      const freshness = Math.max(0, 40 - ageInHours * 0.5);

      // Popularité (0-30) : pondération favs, commentaires et boosts
      const counts = (plan as any)._count;
      const popularity = Math.min(30, (counts?.favorites || 0) + (counts?.comments || 0) * 2 + (counts?.boosts || 0) * 5);

      // Pertinence (0-30) : si le plan correspond aux intérêts de l'utilisateur
      const hasInterest = (plan as any).categorieId && categoryIds.includes((plan as any).categorieId);
      const relevance = hasInterest ? 30 : 0;

      return {
        ...plan,
        score: Math.round(freshness + popularity + relevance),
      };
    });

    // 4. Trier par score et renvoyer les 20 meilleurs
    const result = scoredPlans.sort((a, b) => b.score - a.score).slice(0, 20);

    // Mettre en cache pour 5 minutes
    await this.redis.set(cacheKey, result, FEED_CACHE_TTL);
    
    return result;
  }
}
