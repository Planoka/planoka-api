import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ReportsService } from '../reports/reports.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RedisService } from '../../redis/redis.service';

@Controller('admin')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly reportsService: ReportsService,
    private readonly redis: RedisService,
  ) {}

  // ─── KPIs globaux ──────────────────────────────────────────────
  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // ─── Signalements ──────────────────────────────────────────────
  @Get('reports')
  getReports() {
    return this.reportsService.findAll();
  }

  // ─── Sessions journalières ──────────────────────────────────────
  @Get('stats/sessions/daily')
  getDailyStats() {
    return this.adminService.getDailyStats();
  }

  // ─── Répartition géographique ──────────────────────────────────
  @Get('stats/sessions/geo')
  getGeoStats() {
    return this.adminService.getGeoStats();
  }

  // ─── Utilisateurs actifs en ce moment ─────────────────────────
  @Get('stats/sessions/active')
  getActiveUsers() {
    return this.adminService.getActiveUsers();
  }

  // ─── Modération des plans ──────────────────────────────────────
  @Get('plans')
  getPlans(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.adminService.getPlans(+page, +limit, status);
  }

  @Patch('plans/:id')
  updatePlan(
    @Param('id') id: string,
    @Body() body: { status?: string; isFeatured?: boolean },
  ) {
    return this.adminService.updatePlan(id, body);
  }

  // ─── Gestion des utilisateurs ─────────────────────────────────
  @Get('users')
  getUsers(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.adminService.getUsers(+page, +limit);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() body: { role?: string }) {
    return this.adminService.updateUser(id, body);
  }

  // ─── Recalcul du cache feed ────────────────────────────────────
  @Post('feed/refresh')
  async refreshFeedCache() {
    // Supprime tous les caches de feed recommandé
    const keys = await this.redis.keys('feed:recommended:*');
    if (keys.length > 0) {
      await Promise.all(keys.map((k) => this.redis.del(k)));
    }
    return { success: true, message: `${keys.length} cache(s) invalidé(s)` };
  }
}
