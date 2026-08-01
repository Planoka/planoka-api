import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { MediaModule } from './modules/media/media.module';
import { PlansModule } from './modules/plans/plans.module';
import { CommentsModule } from './modules/comments/comments.module';
import { InteractionsModule } from './modules/interactions/interactions.module';
import { RedisModule } from './redis/redis.module';
import { FeedModule } from './modules/feed/feed.module';
import { EventsModule } from './modules/events/events.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SearchModule } from './modules/search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    MediaModule,
    PlansModule,
    CommentsModule,
    InteractionsModule,
    RedisModule,
    FeedModule,
    EventsModule,
    ReportsModule,
    AdminModule,
    NotificationsModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
