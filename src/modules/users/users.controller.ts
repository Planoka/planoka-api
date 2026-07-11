import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/roles.decorator';
import { SetInterestsDto } from './dto/set-interests.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth('Clerk JWT')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMyProfile(@CurrentUser() user: { clerkId: string }) {
    return this.usersService.getMyProfile(user.clerkId);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: { clerkId: string },
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(user.clerkId, dto);
  }

  // L'ordre est important : 'me/favorites' doit être AVANT ':id'
  @Get('me/favorites')
  getMyFavorites(@CurrentUser() user: { clerkId: string }) {
    return this.usersService.getMyFavorites(user.clerkId);
  }

  @Post('me/interests')
  setMyInterests(
    @CurrentUser() user: { clerkId: string },
    @Body() dto: SetInterestsDto,
  ) {
    return this.usersService.setMyInterests(user.clerkId, dto.categoryIds);
  }

  // ── Follow / Unfollow ──────────────────────────────────────────
  @Post(':id/follow')
  toggleFollow(
    @CurrentUser() user: { clerkId: string },
    @Param('id') targetUserId: string,
  ) {
    return this.usersService.toggleFollow(user.clerkId, targetUserId);
  }

  // Profil public — doit être en DERNIER pour ne pas écraser les routes 'me/...'
  @Get(':id')
  getPublicProfile(
    @Param('id') id: string,
    @CurrentUser() user: { clerkId: string },
  ) {
    // On passe le clerkId du viewer (peut être null si non connecté, mais le guard le gère)
    return this.usersService.getPublicProfile(id, user?.clerkId);
  }
}
