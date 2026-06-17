import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ─── KPIs globaux ──────────────────────────────────────────────
  async getStats() {
    const [usersCount, plansCount, reportsCount, boostsCount, commentsCount] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.plan.count(),
        this.prisma.report.count(),
        this.prisma.boost.count(),
        this.prisma.comment.count(),
      ]);

    return { users: usersCount, plans: plansCount, reports: reportsCount, boosts: boostsCount, comments: commentsCount };
  }

  // ─── Connexions par jour (7 derniers jours) ────────────────────
  async getDailyStats() {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    // On se base sur les UserEvents de type VIEW comme proxy de sessions
    const events = await this.prisma.userEvent.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, userId: true },
    });

    // Grouper par jour
    const byDay: Record<string, Set<string>> = {};
    for (const e of events) {
      const day = e.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = new Set();
      byDay[day].add(e.userId);
    }

    return Object.entries(byDay)
      .map(([date, users]) => ({ date, activeUsers: users.size }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ─── Répartition géographique des utilisateurs ────────────────
  async getGeoStats() {
    const users = await this.prisma.user.groupBy({
      by: ['ville'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    return users.map((u) => ({ ville: u.ville || 'Non renseignée', count: u._count.id }));
  }

  // ─── Utilisateurs actifs dans les 10 dernières minutes ─────────
  async getActiveUsers() {
    const since = new Date(Date.now() - 10 * 60 * 1000);
    const active = await this.prisma.userEvent.findMany({
      where: { createdAt: { gte: since } },
      distinct: ['userId'],
      select: { user: { select: { id: true, nom: true, avatarUrl: true } } },
    });
    return { count: active.length, users: active.map((e) => e.user) };
  }

  // ─── Liste des plans pour modération ──────────────────────────
  async getPlans(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};
    const [data, total] = await Promise.all([
      this.prisma.plan.findMany({
        where,
        include: { user: { select: { nom: true, email: true } }, categorie: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.plan.count({ where }),
    ]);
    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  // ─── Modérer un plan (changer status / featured) ──────────────
  async updatePlan(id: string, data: { status?: string; isFeatured?: boolean }) {
    return this.prisma.plan.update({ where: { id }, data: data as any });
  }

  // ─── Liste des utilisateurs ───────────────────────────────────
  async getUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        select: { id: true, nom: true, email: true, role: true, ville: true, createdAt: true, _count: { select: { plans: true, boosts: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count(),
    ]);
    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  // ─── Modifier le rôle d'un utilisateur ────────────────────────
  async updateUser(id: string, data: { role?: string }) {
    return this.prisma.user.update({ where: { id }, data: data as any });
  }
}
