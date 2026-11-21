import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private connectionErrorLogged = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(redisUrl);
    } catch {
      this.logger.error(
        'REDIS_URL invalide. Redis est désactivé ; le cache ne sera pas utilisé.',
      );
      return;
    }

    if (
      !['redis:', 'rediss:'].includes(parsedUrl.protocol) ||
      !parsedUrl.hostname
    ) {
      this.logger.error(
        'REDIS_URL doit être une URL Redis TCP (redis:// ou rediss://), pas une URL REST HTTPS. Redis est désactivé.',
      );
      return;
    }

    this.client = new Redis(redisUrl, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
    this.client.on('error', (error: Error) => {
      if (!this.connectionErrorLogged) {
        this.logger.warn(
          `Redis indisponible ; utilisation sans cache : ${error.message}`,
        );
        this.connectionErrorLogged = true;
      }
    });
    this.client.on('ready', () => {
      this.connectionErrorLogged = false;
      this.logger.log('Connexion Redis établie');
    });
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  /**
   * Récupère une valeur du cache et la désérialise
   */
  async get(key: string): Promise<any> {
    if (!this.client) return null;

    try {
      const data = await this.client.get(key);
      if (!data) return null;

      try {
        return JSON.parse(data);
      } catch {
        this.logger.warn(
          `Valeur Redis invalide pour la clé "${key}" ; le cache sera ignoré.`,
        );
        return null;
      }
    } catch (error) {
      this.logOperationFailure('lecture', error);
      return null;
    }
  }

  /**
   * Stocke une valeur dans le cache avec un TTL optionnel (en secondes)
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;

    const stringValue = JSON.stringify(value);
    try {
      if (ttlSeconds) {
        await this.client.set(key, stringValue, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, stringValue);
      }
    } catch (error) {
      this.logOperationFailure('écriture', error);
    }
  }

  /**
   * Supprime une clé du cache
   */
  async del(key: string): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.del(key);
    } catch (error) {
      this.logOperationFailure('suppression', error);
    }
  }

  /**
   * Recherche des clés correspondant à un pattern (ex: 'feed:*')
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.client) return [];

    try {
      return await this.client.keys(pattern);
    } catch (error) {
      this.logOperationFailure('recherche de clés', error);
      return [];
    }
  }

  private logOperationFailure(operation: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(
      `Échec de ${operation} Redis ; opération ignorée : ${message}`,
    );
  }
}
