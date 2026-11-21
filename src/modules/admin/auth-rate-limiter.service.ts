import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

interface FailedAttempt {
  count: number;
  blockedUntil?: number;
}

@Injectable()
export class AuthRateLimiterService {
  private readonly logger = new Logger(AuthRateLimiterService.name);
  private readonly inMemoryAttempts = new Map<string, FailedAttempt>();
  private readonly MAX_ATTEMPTS = 5;
  private readonly BLOCK_DURATION_SECONDS = 15 * 60; // 15 minutes

  constructor(private readonly redis: RedisService) {}

  private getKey(identifier: string): string {
    return `auth:ratelimit:${identifier.toLowerCase()}`;
  }

  /**
   * Vérifie si l'adresse IP ou l'email est bloqué suite à trop de tentatives infructueuses
   */
  async checkLimit(identifier: string): Promise<void> {
    const key = this.getKey(identifier);
    const now = Date.now();

    // 1. Essayer Redis
    try {
      const redisData = await this.redis.get(key);
      if (redisData && typeof redisData === 'object') {
        const count = (redisData as FailedAttempt).count || 0;
        const blockedUntil = (redisData as FailedAttempt).blockedUntil || 0;

        if (count >= this.MAX_ATTEMPTS && blockedUntil > now) {
          const remainingMinutes = Math.max(1, Math.ceil((blockedUntil - now) / 60000));
          throw new HttpException(
            `Trop de tentatives de connexion échouées. Compte temporairement verrouillé. Veuillez réessayer dans ${remainingMinutes} minute(s).`,
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }
      return;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // Si Redis échoue, on continue avec la mémoire locale
    }

    // 2. Repli sur le stockage en mémoire
    const attempt = this.inMemoryAttempts.get(key);
    if (attempt && attempt.blockedUntil && attempt.blockedUntil > now) {
      const remainingMinutes = Math.max(1, Math.ceil((attempt.blockedUntil - now) / 60000));
      throw new HttpException(
        `Trop de tentatives de connexion échouées. Compte temporairement verrouillé. Veuillez réessayer dans ${remainingMinutes} minute(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Enregistre un échec de connexion et incrémente le compteur
   */
  async recordFailedAttempt(identifier: string): Promise<void> {
    const key = this.getKey(identifier);
    const now = Date.now();

    // Redis
    try {
      const current = ((await this.redis.get(key)) as FailedAttempt) || { count: 0 };
      current.count = (current.count || 0) + 1;
      if (current.count >= this.MAX_ATTEMPTS) {
        current.blockedUntil = now + this.BLOCK_DURATION_SECONDS * 1000;
      }
      await this.redis.set(key, current, this.BLOCK_DURATION_SECONDS);
    } catch {
      // Ignorer l'erreur Redis
    }

    // En mémoire
    const currentMem = this.inMemoryAttempts.get(key) || { count: 0 };
    currentMem.count += 1;
    if (currentMem.count >= this.MAX_ATTEMPTS) {
      currentMem.blockedUntil = now + this.BLOCK_DURATION_SECONDS * 1000;
    }
    this.inMemoryAttempts.set(key, currentMem);
  }

  /**
   * Réinitialise les tentatives après une connexion réussie
   */
  async clearAttempts(identifier: string): Promise<void> {
    const key = this.getKey(identifier);
    try {
      await this.redis.del(key);
    } catch {
      // Ignorer l'erreur Redis
    }
    this.inMemoryAttempts.delete(key);
  }
}
