import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

// Décorateur pour rendre une route publique (accessible sans être connecté)
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Décorateur pour restreindre l'accès à certains rôles (ex: ADMIN)
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
