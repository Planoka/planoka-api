import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ReportsService } from '../reports/reports.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin')
@UseGuards(RolesGuard)
@Roles('ADMIN') // Seuls les administrateurs peuvent accéder à ces routes
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly reportsService: ReportsService,
  ) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('reports')
  getReports() {
    return this.reportsService.findAll();
  }
}
