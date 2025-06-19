import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataSyncModule } from './data-sync/data-sync.module';
import { Sale } from './data-sync/models/sale.model';
import * as dotenv from 'dotenv';

dotenv.config();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'pass',
      database: process.env.DB_DATABASE || 'sales_db',
      entities: [Sale],
      synchronize: false,
      logging: ['error', 'warn'],
    }),
    DataSyncModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
