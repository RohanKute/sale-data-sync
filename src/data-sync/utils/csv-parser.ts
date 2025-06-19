import * as fs from 'fs';
import { parse } from 'csv-parse';
import * as AdmZip from 'adm-zip';
import { RawSaleData } from '../models/sale.model';
import { Logger } from '@nestjs/common';

export class CsvParser {
  static async parseZipCsv(zipFilePath: string): Promise<RawSaleData[]> {
    let zip: AdmZip;
    try {
      zip = new AdmZip(zipFilePath);
    } catch (error) {
      throw new Error(`Failed to open ZIP file at ${zipFilePath}: ${error.message}`);
    }

    const zipEntries = zip.getEntries();
    zipEntries.find(entry => console.log('zipenrites', entry.entryName));

    const csvFileEntry = zipEntries.find(entry => entry.entryName === '0122_CUR.CSV' || entry.entryName === '0122_CUR.csv');
    if (!csvFileEntry) {
      throw new Error(`No CSV file found in the ZIP archive: ${zipFilePath}`);
    }

    const csvContent = zip.readAsText(csvFileEntry);

    return new Promise((resolve, reject) => {
      parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }, (err, records: RawSaleData[]) => {
        if (err) {
          return reject(new Error(`CSV parsing error: ${err.message}`));
        }
        resolve(records);
      });
    });
  }

  static async parseCsv(filePath: string): Promise<RawSaleData[]> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, { encoding: 'utf8' }, (err, data) => {
        if (err) {
          return reject(new Error(`Failed to read CSV file at ${filePath}: ${err.message}`));
        }
        parse(data, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }, (err, records: RawSaleData[]) => {
          if (err) {
            return reject(new Error(`CSV parsing error: ${err.message}`));
          }
          resolve(records);
        });
      });
    });
  }
}
