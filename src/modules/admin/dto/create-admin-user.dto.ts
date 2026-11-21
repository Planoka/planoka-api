import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Role, Langue, Theme } from '@prisma/client';

export class CreateAdminUserDto {
  @ApiProperty({
    example: 'nouvel.utilisateur@planoka.com',
    description: 'Adresse email unique de l’utilisateur',
  })
  @IsEmail({}, { message: 'Format d’email invalide' })
  @IsNotEmpty({ message: 'L’email est obligatoire' })
  @MaxLength(255, { message: 'L’email ne peut pas dépasser 255 caractères' })
  email: string;

  @ApiProperty({
    example: 'Alice Martin',
    description: 'Nom complet de l’utilisateur',
  })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @MinLength(2, { message: 'Le nom doit comporter au moins 2 caractères' })
  @MaxLength(80, { message: 'Le nom ne peut pas dépasser 80 caractères' })
  nom: string;

  @ApiPropertyOptional({
    example: 'MotDePasseFort123!',
    description:
      'Mot de passe pour connexion locale (minimum 8 caractères, au moins 1 majuscule, 1 minuscule et 1 chiffre ou symbole)',
  })
  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
  @IsOptional()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule et un chiffre ou caractère spécial',
  })
  password?: string;

  @ApiPropertyOptional({
    enum: Role,
    default: Role.USER,
    description: 'Rôle attribué dans le système (USER, MODERATOR, ADMIN)',
  })
  @IsEnum(Role, { message: 'Le rôle doit être USER, MODERATOR ou ADMIN' })
  @IsOptional()
  role?: Role = Role.USER;

  @ApiPropertyOptional({
    example: 'Paris',
    description: 'Ville de résidence',
  })
  @IsString({ message: 'La ville doit être une chaîne de caractères' })
  @IsOptional()
  @MaxLength(80, { message: 'La ville ne peut pas dépasser 80 caractères' })
  ville?: string;

  @ApiPropertyOptional({
    example: 'https://images.planoka.com/avatars/alice.jpg',
    description: 'URL de l’avatar de l’utilisateur',
  })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ enum: Langue, default: Langue.FR })
  @IsEnum(Langue, { message: 'La langue doit être FR ou EN' })
  @IsOptional()
  langue?: Langue;

  @ApiPropertyOptional({ enum: Theme, default: Theme.SYSTEM })
  @IsEnum(Theme, { message: 'Le thème doit être LIGHT, DARK ou SYSTEM' })
  @IsOptional()
  theme?: Theme;

  @ApiPropertyOptional({
    description: 'Identifiant externe Clerk optionnel si le compte est lié à Clerk',
  })
  @IsString()
  @IsOptional()
  clerkId?: string;
}
