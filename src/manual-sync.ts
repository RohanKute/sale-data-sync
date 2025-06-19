import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSyncService } from './data-sync/data-sync.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('ManualSyncRunner');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSyncService = app.get(DataSyncService);
  const zipFilePath = process.argv[2];

  if (!zipFilePath) {
    logger.error('Error: Please provide the absolute path to the source ZIP file as an argument.');
    logger.log('Usage: ts-node src/manual-sync.ts /path/to/your/0122_CUR_Source.zip');
    await app.close();
    process.exit(1);
  }

  logger.log(`Starting manual data synchronization for: ${zipFilePath}`);
  try {
    const result = await dataSyncService.syncSalesData(zipFilePath);
    logger.log('Manual sync completed successfully!');
  } catch (error) {
    logger.error('Manual sync failed:', error.message);
    process.exit(1);
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
