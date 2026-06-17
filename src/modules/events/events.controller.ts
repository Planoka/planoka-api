import { Controller, Post, Body } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('events')
@ApiBearerAuth('Clerk JWT')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  create(
    @CurrentUser() user: { clerkId: string },
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.create(user.clerkId, dto);
  }
}
