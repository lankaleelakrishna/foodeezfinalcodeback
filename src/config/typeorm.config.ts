import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export const typeOrmConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: process.env.DATABASE_URL, // ✅ use this
  ssl: {
    rejectUnauthorized: false, // ✅ required for Supabase
  },
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',
  migrationsRun: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
});