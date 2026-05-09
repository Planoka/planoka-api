import { IsEnum, IsUUID, IsNotEmpty } from 'class-validator';
import { EventType } from '@prisma/client';

export class CreateEventDto {
  @IsEnum(EventType)
  type: EventType;

  @IsUUID()
  @IsNotEmpty()
  planId: string;
}
