import { ValidationPipe, INestApplication, RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { join } from 'path';
import { AppModule } from './app.module';

async function migrateDocumentTypeColumn(app: INestApplication) {
  const dataSource = app.get(DataSource);
  try {
    const [columnInfo] = await dataSource.query(
      `SELECT data_type, udt_name
       FROM information_schema.columns
       WHERE table_name = 'Document' AND column_name = 'type' AND table_schema = 'public'`
    );

    if (!columnInfo) {
      console.warn('⚠️ Document.type migration skipped: Document table or type column not found');
      return;
    }

    if (columnInfo.data_type === 'text') {
      console.log('✅ Document.type column is already text');
      return;
    }

    console.log(`ℹ️ Document.type current data type: ${columnInfo.data_type} (${columnInfo.udt_name})`);
    await dataSource.query('ALTER TABLE "Document" ALTER COLUMN "type" TYPE text USING "type"::text');
    console.log('✅ Document.type column migrated to text');
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
    console.warn('⚠️ Document.type migration failed:', errorMessage);
  }
}

async function migrateRestaurantExtractedMenuColumn(app: INestApplication) {
  const dataSource = app.get(DataSource);
  try {
    const [columnInfo] = await dataSource.query(
      `SELECT data_type
       FROM information_schema.columns
       WHERE table_name = 'Restaurant' AND column_name = 'extracted_menu' AND table_schema = 'public'`
    );

    if (columnInfo) {
      console.log('✅ Restaurant.extracted_menu column already exists');
      return;
    }

    console.log('ℹ️ Adding Restaurant.extracted_menu column');
    await dataSource.query('ALTER TABLE "Restaurant" ADD COLUMN "extracted_menu" jsonb');
    console.log('✅ Restaurant.extracted_menu column created successfully');
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
    console.warn('⚠️ Restaurant.extracted_menu migration failed:', errorMessage);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const express = require('express');
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(express.json({ limit: '20mb' }));
  expressApp.get('/favicon.ico', (_req: any, res: any) => res.sendStatus(204));
  expressApp.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  // Legacy and alias preview routes redirected to the new public preview endpoint
  expressApp.get('/api/v1/restaurants/:restaurantId/documents/:documentId/preview', (req: any, res: any) => {
    return res.redirect(`/api/v1/documents/preview/${req.params.documentId}`);
  });
  expressApp.get('/documents/:documentId/preview', (req: any, res: any) => {
    return res.redirect(`/api/v1/documents/preview/${req.params.documentId}`);
  });
  expressApp.get('/restaurants/:restaurantId/documents/:documentId/preview', (req: any, res: any) => {
    return res.redirect(`/api/v1/documents/preview/${req.params.documentId}`);
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  });

  await migrateDocumentTypeColumn(app);
  await migrateRestaurantExtractedMenuColumn(app);

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);

  console.log(`🚀 Server running on http://localhost:${port}`);
}

bootstrap();