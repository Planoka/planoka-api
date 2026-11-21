import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({
    example: 'admin@planoka.com',
    description: 'Adresse email de l’administrateur',
  })
  @IsEmail({}, { message: 'Format d’email invalide' })
  @IsNotEmpty({ message: 'L’email est obligatoire' })
  email!: string;

  @ApiProperty({
    example: 'AdminSecret123!',
    description: 'Mot de passe administrateur (minimum 6 caractères)',
  })
  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  password!: string;
}
