import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('comments')
@ApiBearerAuth('Clerk JWT')
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

  // DELETE /api/plans/:planId/comments/:commentId
  @Delete(':commentId')
  remove(
    @Param('commentId') commentId: string,
    @CurrentUser() user: { clerkId: string },
  ) {
    return this.commentsService.remove(commentId, user.clerkId);
  }
}
