import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Affiche les requêtes SQL en mode développement
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
  }

  async onModuleInit() {
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        this.logger.log('✅ Base de données connectée via Prisma');
        return;
      } catch (error) {
        const isUnreachable =
          error instanceof Error &&
          'errorCode' in error &&
          error.errorCode === 'P1001';

        if (!isUnreachable || attempt === maxAttempts) {
          throw error;
        }

        const delayMs = 1000 * 2 ** (attempt - 1);
        this.logger.warn(
          `Base de données inaccessible (P1001). Nouvelle tentative ${attempt + 1}/${maxAttempts} dans ${delayMs / 1000}s.`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 Connexion Prisma fermée');
  }

  /**
   * Trouve un utilisateur indifféremment par son id interne ou son clerkId
   */
  async findUserByIdOrClerkId(identifier: string) {
    if (!identifier) return null;
    return this.user.findFirst({
      where: {
        OR: [{ clerkId: identifier }, { id: identifier }],
      },
    });
  }
}
