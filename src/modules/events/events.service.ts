import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(clerkId: string, dto: CreateEventDto) {
    const user = await this.prisma.findUserByIdOrClerkId(clerkId);
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    return this.prisma.userEvent.create({
      data: {
        eventType: dto.type,
        planId: dto.planId,
        userId: user.id,
      },
    });
  }
}
