import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Affiche les requêtes SQL en mode développement
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Base de données connectée via Prisma');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 Connexion Prisma fermée');
  }
}
