import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ClerkGuard } from './clerk.guard';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  // En fournissant les Guards ici avec APP_GUARD, ils s'appliqueront globalement
  // à TOUTE l'application par défaut.
  // Utilisez @Public() sur les routes qui ne nécessitent pas d'authentification.
  providers: [
    {
      provide: APP_GUARD,
      useClass: ClerkGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [],
})
export class AuthModule {}
