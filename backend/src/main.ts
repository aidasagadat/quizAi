import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = new Logger('Bootstrap');
  const port = Number(process.env.PORT ?? 4000);
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

  app.use(json({ limit: '10mb' }));
  app.enableCors({ origin: corsOrigin.split(',').map(s => s.trim()), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('QuizAI API')
    .setDescription('AI-powered quiz generation service')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/v1/docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(port);
  logger.log(`API: http://localhost:${port}/api/v1`);
  logger.log(`Docs: http://localhost:${port}/api/v1/docs`);
}
bootstrap();
