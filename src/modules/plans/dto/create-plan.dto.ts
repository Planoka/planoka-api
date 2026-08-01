import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { LocationSource } from '@prisma/client';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  titre: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  ville: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsEnum(LocationSource)
  locationSource?: LocationSource;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  images?: string[];

  // Si on a des images, videoUrl doit être vide, et vice-versa.
  // Validation simple : la vidéo est optionnelle, mais on peut ajouter une logique custom.
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsNotEmpty()
  categoryIds: string[];
}
