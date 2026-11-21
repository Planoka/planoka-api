import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';

export class AssignRoleDto {
  @ApiProperty({
    enum: Role,
    example: Role.MODERATOR,
    description: 'Nouveau rôle attribué à l’utilisateur (USER, MODERATOR, ADMIN)',
  })
  @IsEnum(Role, { message: 'Le rôle doit être USER, MODERATOR ou ADMIN' })
  @IsNotEmpty({ message: 'Le rôle est obligatoire' })
  role: Role;
}
