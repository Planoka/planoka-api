import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class AdminUpdatePlanDto {
  @IsEnum(['PENDING', 'ACTIVE', 'REJECTED', 'ARCHIVED'])
  @IsOptional()
  status?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isFeatured?: boolean;
}

export class AdminUpdateUserDto {
  @IsEnum(['USER', 'MODERATOR', 'ADMIN'])
  @IsOptional()
  role?: string;
}
