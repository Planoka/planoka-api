import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/roles.decorator';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Public() // Le feed global est public
  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('categoryId') categoryId?: string,
    @Query('ville') ville?: string,
  ) {
    return this.plansService.findAll({ page, limit, categoryId, ville });
  }

  @Post()
  create(
    @CurrentUser() user: { clerkId: string },
    @Body() createPlanDto: CreatePlanDto,
  ) {
    return this.plansService.create(user.clerkId, createPlanDto);
  }

  @Public() // Le détail d'un plan est public
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
