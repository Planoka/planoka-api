import { Controller, Post, Param } from '@nestjs/common';
import { InteractionsService } from './interactions.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/roles.decorator';

@Controller('plans/:id')
export class InteractionsController {
  constructor(private readonly interactionsService: InteractionsService) {}

  @Post('favorite')
  toggleFavorite(@Param('id') id: string, @CurrentUser() user: { clerkId: string }) {
    return this.interactionsService.toggleFavorite(id, user.clerkId);
  }

  @Post('boost')
  toggleBoost(@Param('id') id: string, @CurrentUser() user: { clerkId: string }) {
    return this.interactionsService.toggleBoost(id, user.clerkId);
  }

  @Public() // Le partage est une action qui peut être publique
  @Post('share')
  recordShare(@Param('id') id: string) {
    return this.interactionsService.recordShare(id);
  }
}
