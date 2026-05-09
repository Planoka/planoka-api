import { IsString, IsOptional, IsEnum } from 'class-validator';
import { Langue, Theme } from '@prisma/client';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  nom?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsEnum(Langue)
  @IsOptional()
  langue?: Langue;

  @IsEnum(Theme)
  @IsOptional()
  theme?: Theme;

  @IsString()
  @IsOptional()
  ville?: string;
}
