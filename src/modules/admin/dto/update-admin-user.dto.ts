import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Role, Langue, Theme } from '@prisma/client';

export class UpdateAdminUserDto {
  @ApiPropertyOptional({
    example: 'jean.dupont@planoka.com',
    description: 'Nouvelle adresse email',
  })
  @IsEmail({}, { message: 'Format d’email invalide' })
  @IsOptional()
  @MaxLength(255, { message: 'L’email ne peut pas dépasser 255 caractères' })
  email?: string;

  @ApiPropertyOptional({
    example: 'Jean Dupont',
    description: 'Nom de l’utilisateur',
  })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsOptional()
  @MinLength(2, { message: 'Le nom doit comporter au moins 2 caractères' })
  @MaxLength(80, { message: 'Le nom ne peut pas dépasser 80 caractères' })
  nom?: string;

  @ApiPropertyOptional({
    example: 'NouveauMotDePasse123!',
    description: 'Nouveau mot de passe (si réinitialisation)',
  })
  @IsString()
  @IsOptional()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule et un chiffre ou caractère spécial',
  })
  password?: string;

  @ApiPropertyOptional({
    enum: Role,
    description: 'Rôle attribué dans le système',
  })
  @IsEnum(Role, { message: 'Le rôle doit être USER, MODERATOR ou ADMIN' })
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({
    example: 'Marseille',
    description: 'Ville de résidence',
  })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  ville?: string;

  @ApiPropertyOptional({
    example: 'https://images.planoka.com/avatars/jean.jpg',
  })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ enum: Langue })
  @IsEnum(Langue)
  @IsOptional()
  langue?: Langue;

  @ApiPropertyOptional({ enum: Theme })
  @IsEnum(Theme)
  @IsOptional()
  theme?: Theme;
}
