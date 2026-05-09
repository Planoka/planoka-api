import { Controller, Get } from '@nestjs/common';
import { FeedService } from './feed.service';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get('recommended')
  getRecommended(@CurrentUser() user: { clerkId: string }) {
    return this.feedService.getRecommended(user.clerkId);
  }
}
