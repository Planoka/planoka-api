import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [usersCount, plansCount, reportsCount, boostsCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.plan.count(),
      this.prisma.report.count(),
      this.prisma.boost.count(),
    ]);

    return {
      users: usersCount,
      plans: plansCount,
      reports: reportsCount,
      boosts: boostsCount,
    };
  }
}
