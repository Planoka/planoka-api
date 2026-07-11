import {
  Controller,
  Post,
  Headers,
  RawBodyRequest,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../auth/roles.decorator';

/**
 * Vérifie la signature Svix sans dépendance externe.
 * Algorithme : HMAC-SHA256 sur "${svix-id}.${svix-timestamp}.${rawBody}"
 * Les buffers sont comparés en binaire pour éviter les erreurs de taille avec timingSafeEqual.
 */
function verifySvixSignature(
  rawBody: Buffer,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string,
): void {
  // Retirer le préfixe "whsec_" et décoder en base64 → Buffer binaire
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');

  // Message signé = "svix-id.svix-timestamp." + rawBody (en binaire, pas en string)
  const prefix = Buffer.from(`${svixId}.${svixTimestamp}.`);
  const toSign = Buffer.concat([prefix, rawBody]);

  // HMAC SHA256 → digest binaire (Buffer)
  const computedHmacBuffer = createHmac('sha256', secretBytes).update(toSign).digest();

  // La signature fournie peut contenir plusieurs valeurs séparées par des espaces
  const signatures = svixSignature.split(' ');
  const isValid = signatures.some((sig) => {
    try {
      const sigValue = sig.replace(/^v1,/, '');
      const sigBuffer = Buffer.from(sigValue, 'base64');
      // timingSafeEqual requiert des buffers de même taille
      if (computedHmacBuffer.length !== sigBuffer.length) return false;
      return timingSafeEqual(computedHmacBuffer, sigBuffer);
    } catch {
      return false;
    }
  });

  if (!isValid) throw new BadRequestException('Signature webhook invalide');
}

// Les webhooks Clerk sont publics — Clerk signe lui-même la requête
@Public()
@Controller('webhooks/clerk')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private prisma: PrismaService) {}

  @Post()
  async handleClerkWebhook(
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Req() req: any,
  ) {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) throw new BadRequestException('CLERK_WEBHOOK_SECRET non configuré');
    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException('Headers Svix manquants');
    }

    const rawBody = req.rawBody;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      throw new BadRequestException('Corps de la requête invalide ou manquant');
    }

    // 1. Vérifier la signature (comparaison binaire)
    verifySvixSignature(rawBody, svixId, svixTimestamp, svixSignature, secret);

    // 2. Parser l'événement
    const event = JSON.parse(rawBody.toString('utf8'));
    const { type, data } = event;

    this.logger.log(`Clerk webhook received: ${type}`);

    // 3. Synchroniser l'utilisateur selon le type d'événement
    if (type === 'user.created' || type === 'user.updated') {
      const email = data.email_addresses?.[0]?.email_address;
      if (!email) {
        this.logger.warn(`Webhook ${type}: no email found for user ${data.id}`);
        return { received: true };
      }
      const firstName = data.first_name || '';
      const lastName = data.last_name || '';
      const nom = `${firstName} ${lastName}`.trim() || data.username || 'Utilisateur';
      const avatarUrl = data.image_url || null;

      await this.prisma.user.upsert({
        where: { clerkId: data.id },
        update: { nom, email, avatarUrl },
        create: { clerkId: data.id, nom, email, avatarUrl },
      });
      this.logger.log(`User ${type === 'user.created' ? 'created' : 'updated'}: ${email}`);
    }

    if (type === 'user.deleted') {
      await this.prisma.user.deleteMany({ where: { clerkId: data.id } });
      this.logger.log(`User deleted: ${data.id}`);
    }

    return { received: true };
  }
}
