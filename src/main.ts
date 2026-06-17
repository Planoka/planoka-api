import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  // rawBody: true est obligatoire pour vérifier la signature du webhook Clerk (Svix)
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Sécurité HTTP
  app.use(helmet());
  app.enableCors();

  // Préfixe global : tous les endpoints commencent par /api
  app.setGlobalPrefix('api');

  // Validation des DTOs
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Filtre d'exceptions global — réponses d'erreur structurées
  app.useGlobalFilters(new HttpExceptionFilter());

  // Intercepteur global — enveloppe les réponses dans { success, data, timestamp }
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ─── Swagger / OpenAPI ─────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Planoka API')
    .setDescription(
      'API RESTful de la plateforme Planoka — gestion de plans, interactions sociales, feed recommandé et administration.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'Clerk JWT',
    )
    .addTag('auth', 'Authentification & webhooks Clerk')
    .addTag('users', 'Profils utilisateurs')
    .addTag('plans', 'Plans / événements')
    .addTag('feed', 'Feed recommandé')
    .addTag('interactions', 'Boosts & favoris')
    .addTag('comments', 'Commentaires')
    .addTag('categories', 'Catégories')
    .addTag('media', 'Upload fichiers (Cloudinary)')
    .addTag('events', 'Tracking comportemental')
    .addTag('reports', 'Signalements')
    .addTag('notifications', 'Notifications')
    .addTag('admin', 'Administration (ADMIN only)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
  // ──────────────────────────────────────────────────────────────

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Planoka API running on http://localhost:${port}/api`);
  console.log(`📚 Swagger docs at   http://localhost:${port}/docs`);
}
bootstrap();
