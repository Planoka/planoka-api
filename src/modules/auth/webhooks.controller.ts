import {
  Controller,
  Post,
  Headers,
  RawBodyRequest,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../auth/roles.decorator';

/**
 * Vérifie la signature Svix sans dépendance externe.
 * Algorithme : HMAC-SHA256 sur "${svix-id}.${svix-timestamp}.${rawBody}"
 */
function verifySvixSignature(
  rawBody: Buffer,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string,
): void {
  // Le secret Svix commence par "whsec_" — on retire ce préfixe et on décode en base64
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');

  // Message signé = "svix-id.svix-timestamp.rawBody"
  const toSign = `${svixId}.${svixTimestamp}.${rawBody.toString()}`;

  // HMAC SHA256
  const computedHmac = createHmac('sha256', secretBytes).update(toSign).digest('base64');

  // La signature fournie peut contenir plusieurs valeurs séparées par des espaces (ex: "v1,xxx v1,yyy")
  const signatures = svixSignature.split(' ');
  const isValid = signatures.some((sig) => {
    const sigValue = sig.replace(/^v1,/, '');
    try {
      return timingSafeEqual(Buffer.from(computedHmac), Buffer.from(sigValue));
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

    // 1. Vérifier la signature
    verifySvixSignature(req.rawBody as Buffer, svixId, svixTimestamp, svixSignature, secret);

    // 2. Parser l'événement
    const event = JSON.parse((req.rawBody as Buffer).toString());
    const { type, data } = event;

    // 3. Synchroniser l'utilisateur selon le type d'événement
    if (type === 'user.created' || type === 'user.updated') {
      const email = data.email_addresses?.[0]?.email_address;
      const firstName = data.first_name || '';
      const lastName = data.last_name || '';
      const nom = `${firstName} ${lastName}`.trim() || 'Utilisateur';
      const avatarUrl = data.image_url || null;

      await this.prisma.user.upsert({
        where: { clerkId: data.id },
        update: { nom, email, avatarUrl },
        create: { clerkId: data.id, nom, email, avatarUrl },
      });
    }

    if (type === 'user.deleted') {
      await this.prisma.user.deleteMany({ where: { clerkId: data.id } });
    }

    return { received: true };
  }
}
