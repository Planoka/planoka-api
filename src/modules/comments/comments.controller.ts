import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/roles.decorator';

@Controller('plans/:planId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(
    @Param('planId') planId: string,
    @CurrentUser() user: { clerkId: string },
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(planId, user.clerkId, dto);
  }

  @Public()
  @Get()
  findAll(@Param('planId') planId: string) {
    return this.commentsService.findByPlan(planId);
  }
}
