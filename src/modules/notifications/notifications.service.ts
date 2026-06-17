import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private resend: Resend | null = null;

  constructor(private readonly configService: ConfigService) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
    } else {
      this.logger.warn('RESEND_API_KEY non configuré. L\'envoi d\'emails sera simulé dans les logs.');
    }
  }

  /**
   * Envoie un email transactionnel via Resend
   */
  async sendEmail(to: string, subject: string, html: string): Promise<any> {
    const from = this.configService.get<string>('MAIL_FROM') || 'Planoka <noreply@planoka.com>';

    if (this.resend) {
      try {
        const { data, error } = await this.resend.emails.send({
          from,
          to,
          subject,
          html,
        });

        if (error) {
          this.logger.error(`Erreur Resend lors de l'envoi de l'email à ${to}:`, error);
          return { success: false, error };
        }

        this.logger.log(`[EMAIL] Envoyé avec succès à ${to}. ID: ${data?.id}`);
        return { success: true, data };
      } catch (err) {
        this.logger.error(`Erreur inattendue lors de l'envoi de l'email à ${to}:`, err);
        return { success: false, error: err };
      }
    } else {
      this.logger.log(`[EMAIL SIMULÉ] De: ${from} | Pour: ${to} | Sujet: ${subject}\nContenu: ${html}`);
      return { success: true, simulated: true };
    }
  }

  /**
   * Envoie une notification push via Expo Push API
   */
  async sendPushNotification(pushToken: string, title: string, body: string, data?: any) {
    if (!pushToken) return { success: false, error: 'Token push manquant' };

    // Vérifier si le token est un token Expo valide
    if (!pushToken.startsWith('ExponentPushToken[')) {
      this.logger.warn(`Token push invalide: ${pushToken}`);
      return { success: false, error: 'Token push invalide' };
    }

    try {
      const message = {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Erreur de l'API Expo Push (${response.status}): ${errText}`);
        return { success: false, error: errText };
      }

      const resJson = await response.json();
      this.logger.log(`[PUSH] Envoyé à ${pushToken}: ${title} - ${body}`);
      return { success: true, data: resJson };
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi du push à ${pushToken}:`, error);
      return { success: false, error };
    }
  }
}
