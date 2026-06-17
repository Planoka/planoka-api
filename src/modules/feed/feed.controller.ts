import { Controller, Get } from '@nestjs/common';
import { FeedService } from './feed.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('feed')
@ApiBearerAuth('Clerk JWT')
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  // Feed personnalisé — utilisateurs connectés
  @Get('recommended')
  getRecommended(@CurrentUser() user: { clerkId: string }) {
    return this.feedService.getRecommended(user.clerkId);
  }

  // Top boosts de la semaine — public (visiteurs non connectés)
  @Public()
  @Get('top')
  getTopWeekly() {
    return this.feedService.getTopWeekly();
  }
}
