import { Controller, Post, Body, Param } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('plans/:id/report')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  create(
    @Param('id') planId: string,
    @CurrentUser() user: { clerkId: string },
    @Body() dto: CreateReportDto,
  ) {
    return this.reportsService.create(planId, user.clerkId, dto);
  }
}
