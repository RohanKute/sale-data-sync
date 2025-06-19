import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

// TypeORM Entity representing the 'sales_data' table in PostgreSQL
@Entity('sales_data')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index({ unique: true })
  transaction_composite_id: string;

  @Column({ type: 'varchar', length: 100 })
  county_name: string;

  @Column({ type: 'varchar', length: 100 })
  muni_name: string;

  @Column('text')
  property_address: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  zip_code: string;

  @Column({ type: 'date' })
  sale_date: string; 

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  sale_price: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  property_type: string;

  @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
  lot_size_acres: number;

  @Column({ type: 'varchar', length: 50 })
  swis_county: string;

  @Column({ type: 'varchar', length: 50 })
  book: string;

  @Column({ type: 'varchar', length: 50 })
  page: string;

  @Column({ type: 'date' })
  deed_date: string; 

  @Column({ type: 'text', nullable: true })
  street_nbr: string;

  @Column({ type: 'text', nullable: true })
  street_name: string;

  @Column({ type: 'text', nullable: true })
  prop_class_desc_at_sale: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  source_checksum: string;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}

export interface RawSaleData {
  swis_code: string; 
  county_name: string;
  muni_name: string;
  street_nbr: string;
  street_name: string;
  book: string;
  page: string;
  deed_date: string;
  sale_date: string;
  sale_price: string;
  zip5: string;
  prop_class_desc_at_sale: string;
  total_sale_acres: string;
}