import { Module, Logger } from '@nestjs/common';
import { DatabaseService } from './db.service';
import { Pool, PoolConfig } from 'pg';
import { ModuleRef } from '@nestjs/core';

const databaseConfig: PoolConfig = {
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  host: process.env.PGHOST || '127.0.0.1',
  port: parseInt(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'postgres',
  max: parseInt(process.env.PGMAXPOOLSIZE) || 20,
  connectionTimeoutMillis: parseInt(process.env.PGCONNECTIONTIMEOUT) || 0,
  idleTimeoutMillis: parseInt(process.env.PGIDLETIMEOUT) || 0,
};

const databasePoolFactory = () => new Pool(databaseConfig);

@Module({
  imports: [],
  controllers: [],
  providers: [
    {
      provide: 'DatabasePool',
      useFactory: databasePoolFactory,
    },
    DatabaseService,
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  onApplicationShutdown(signal?: string): any {
    this.logger.log(`Shutting down on signal ${signal}`);
    const pool = this.moduleRef.get('DatabasePool') as Pool;
    return pool.end();
  }
}
