import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { initSentry } from './common/sentry';
import { AppModule } from './app.module';

async function bootstrap() {
  // Init Sentry BEFORE the app so early boot errors get reported too.
  initSentry();

  // bufferLogs so early startup lines can be replayed through pino once the
  // LoggerModule has registered — otherwise we'd get a mix of stdout + pino.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  const logger = new Logger('Bootstrap');

  // Helmet — same defaults everywhere plus a stricter CSP in production.
  // In dev we keep 'unsafe-inline' + 'unsafe-eval' so Next.js's dev overlay
  // and hot reload still work; prod locks scripts to same-origin only.
  const isProd = process.env.NODE_ENV === 'production';
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            useDefaults: true,
            directives: {
              // Backend serves JSON — no scripts or embeds should ever load
              // from an API response. Locked tight.
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"], // Swagger inlines styles
              imgSrc: ["'self'", 'data:', 'blob:'],
              connectSrc: ["'self'"],
              frameAncestors: ["'none'"],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,
      hsts: isProd
        ? { maxAge: 15_552_000, includeSubDomains: true, preload: true }
        : false,
      // The frontend is on a different origin — we set our own CORS above,
      // helmet's Cross-Origin-Resource-Policy shouldn't second-guess.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );
  app.use(cookieParser());
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger docs (dev only)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SpecialParents.in API')
      .setDescription('Inclusive special-needs care platform — REST API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(port, '0.0.0.0');
  logger.log(`SpecialParents API ready → http://localhost:${port}/api`);
  logger.log(`Swagger docs           → http://localhost:${port}/api/docs`);
}

bootstrap();
