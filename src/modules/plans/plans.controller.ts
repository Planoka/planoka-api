import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/roles.decorator';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';

@ApiTags('plans')
@ApiBearerAuth('Clerk JWT')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Public()
  @Get()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'ville', required: false })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter plans by creator (backend DB user id)' })
  @ApiQuery({ name: 'favoritedBy', required: false, description: 'Filter plans favorited by this user id' })
  @ApiQuery({ name: 'boostedBy', required: false, description: 'Filter plans boosted by this user id' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('categoryId') categoryId?: string,
    @Query('ville') ville?: string,
    @Query('userId') userId?: string,
    @Query('favoritedBy') favoritedBy?: string,
    @Query('boostedBy') boostedBy?: string,
  ) {
    return this.plansService.findAll({ page, limit, categoryId, ville, userId, favoritedBy, boostedBy });
  }

  @Post()
  create(
    @CurrentUser() user: { clerkId: string },
    @Body() createPlanDto: CreatePlanDto,
  ) {
    return this.plansService.create(user.clerkId, createPlanDto);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: { clerkId: string },
    @Body() updatePlanDto: UpdatePlanDto,
  ) {
    return this.plansService.update(id, user.clerkId, updatePlanDto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { clerkId: string },
  ) {
    return this.plansService.remove(id, user.clerkId);
  }
}
