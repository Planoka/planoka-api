import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClerkGuard } from './clerk.guard';
import { RolesGuard } from './roles.guard';
import { AuthController } from './auth.controller';
import { WebhooksController } from './webhooks.controller';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:
          config.get<string>('JWT_SECRET') ||
          'planoka-default-secret-key-change-in-production-2025',
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') || '24h') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController, WebhooksController],
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
  exports: [JwtModule],
})
export class AuthModule {}
