import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // The mobile app never needed this (React Native's fetch doesn't enforce
  // CORS) but the dashboard is a browser app on a different origin —
  // without this, every request from it fails silently at the browser
  // before it even reaches a controller. Wide open (any origin) is fine
  // for this pilot: there's no cookie-based session to protect, every
  // request already needs a bearer token the browser can't forge blind.
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((error: unknown) => {
  console.error('Failed to start application', error);
  process.exit(1);
});
