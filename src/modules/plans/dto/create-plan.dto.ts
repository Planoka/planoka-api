import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateIf, IsUUID } from 'class-validator';

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

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  images?: string[];

  // Si on a des images, videoUrl doit être vide, et vice-versa.
  // Validation simple : la vidéo est optionnelle, mais on peut ajouter une logique custom.
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;
}
