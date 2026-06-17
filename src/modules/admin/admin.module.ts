import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ReportsModule } from '../reports/reports.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [ReportsModule, RedisModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
