import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Sale, RawSaleData } from './models/sale.model';
import { CsvParser } from './utils/csv-parser';
import * as crypto from 'crypto';

@Injectable()
export class DataSyncService {
  private readonly logger = new Logger(DataSyncService.name);

  constructor(
    @InjectRepository(Sale)
    private salesRepository: Repository<Sale>,
  ) {}

  private generateChecksum(data: RawSaleData): string {
    const relevantData = {
      county_name: data.county_name || '',
      muni_name: data.muni_name || '',
      street_nbr: data.street_nbr || '',
      street_name: data.street_name || '',
      zip5: data.zip5 || '',
      sale_date: data.sale_date || '',
      sale_price: data.sale_price || '',
      prop_class_desc_at_sale: data.prop_class_desc_at_sale || '',
      total_sale_acres: data.total_sale_acres || '',
    };
    const dataString = JSON.stringify(relevantData);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private transformRawData(rawData: RawSaleData[]): Sale[] {
    return rawData.map(row => {
      const sale = new Sale();
      const swisCounty = row.swis_code || '';
      const book = row.book || '';
      const page = row.page || '';
      const deedDate = row.deed_date || '';
      sale.transaction_composite_id = `${swisCounty}-${book}-${page}-${deedDate}`;
      sale.county_name = row.county_name || '';
      sale.muni_name = row.muni_name || '';
      sale.property_address = `${row.street_nbr || ''} ${row.street_name || ''}`.trim();
      sale.zip_code = row.zip5 || '';
      sale.sale_date = row.sale_date;
      sale.sale_price = parseFloat(row.sale_price);
      sale.property_type = row.prop_class_desc_at_sale || '';
      sale.lot_size_acres = parseFloat(row.total_sale_acres);
      sale.swis_county = swisCounty;
      sale.book = book;
      sale.page = page;
      sale.deed_date = deedDate;
      sale.street_nbr = row.street_nbr || '';
      sale.street_name = row.street_name || '';
      sale.prop_class_desc_at_sale = row.prop_class_desc_at_sale || '';
      sale.source_checksum = this.generateChecksum(row);
      return sale;
    });
  }

  async syncSalesData(sourceFilePath: string): Promise<any> {
    this.logger.log(`Starting data synchronization from ${sourceFilePath}`);
    let syncSummary = {
      inserted: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
    };

    try {
      const rawSourceData = await CsvParser.parseZipCsv(sourceFilePath);
      const newSalesData = this.transformRawData(rawSourceData);
      const newTransactionCompositeIds = new Set(newSalesData.map(s => s.transaction_composite_id));
      const existingSales = await this.salesRepository.find();
      const existingSalesMap = new Map<string, Sale>();
      existingSales.forEach(sale => existingSalesMap.set(sale.transaction_composite_id, sale));
      const salesToInsert: Sale[] = [];
      const salesToUpdate: Sale[] = [];
      const transactionIdsToDelete: string[] = [];

      for (const newSale of newSalesData) {
        const existingSale = existingSalesMap.get(newSale.transaction_composite_id);

        if (!existingSale) {
          salesToInsert.push(newSale);
        } else {
          if (newSale.source_checksum !== existingSale.source_checksum) {
            Object.assign(existingSale, newSale);
            salesToUpdate.push(existingSale);
          }
          existingSalesMap.delete(newSale.transaction_composite_id);
        }
      }

      existingSalesMap.forEach(sale => {
        transactionIdsToDelete.push(sale.transaction_composite_id);
      });

      if (transactionIdsToDelete.length > 0) {
        this.logger.log(`Deleting ${transactionIdsToDelete.length} records.`);
        const deleteResult = await this.salesRepository.delete({ transaction_composite_id: In(transactionIdsToDelete) });
        syncSummary.deleted = deleteResult.affected || 0;
      }

      if (salesToInsert.length > 0) {
        this.logger.log(`Inserting ${salesToInsert.length} new records.`);
        for (const sale of salesToInsert) {
          try {
            await this.salesRepository.save(sale);
          } catch (insertError) {
            this.logger.error(`Failed to insert record with ID ${sale.transaction_composite_id}: ${insertError.message}`);
            syncSummary.errors++;
          }
        }
        syncSummary.inserted = salesToInsert.length - syncSummary.errors;
      }

      if (salesToUpdate.length > 0) {
        this.logger.log(`Updating ${salesToUpdate.length} records.`);
        for (const sale of salesToUpdate) {
          try {
            await this.salesRepository.update(
              { transaction_composite_id: sale.transaction_composite_id },
              {
                county_name: sale.county_name,
                muni_name: sale.muni_name,
                property_address: sale.property_address,
                zip_code: sale.zip_code,
                sale_date: sale.sale_date,
                sale_price: sale.sale_price,
                property_type: sale.property_type,
                lot_size_acres: sale.lot_size_acres,
                swis_county: sale.swis_county,
                book: sale.book,
                page: sale.page,
                deed_date: sale.deed_date,
                street_nbr: sale.street_nbr,
                street_name: sale.street_name,
                prop_class_desc_at_sale: sale.prop_class_desc_at_sale,
                source_checksum: sale.source_checksum
              }
            );
          } catch (updateError) {
            this.logger.error(`Failed to update record with ID ${sale.transaction_composite_id}: ${updateError.message}`);
            syncSummary.errors++;
          }
        }
        syncSummary.updated = salesToUpdate.length - syncSummary.errors;
      }

      this.logger.log('Data synchronization completed successfully.');
      this.logger.log(`Sync Summary: ${JSON.stringify(syncSummary)}`);
      return syncSummary;

    } catch (error) {
      this.logger.error(`Error during data synchronization: ${error.message}`, error.stack);
      syncSummary.errors++;
      throw error;
    }
  }
}
