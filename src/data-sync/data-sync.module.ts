import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSyncService } from './data-sync.service';
import { Sale } from './models/sale.model'; // Import the Sale entity

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale]),
  ],
  providers: [DataSyncService], 
  exports: [DataSyncService],  
})
export class DataSyncModule {}