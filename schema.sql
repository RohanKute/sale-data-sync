DROP TABLE IF EXISTS sales_data CASCADE;

CREATE TABLE sales_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_composite_id VARCHAR(255) UNIQUE NOT NULL,
    county_name VARCHAR(100) NOT NULL,
    muni_name VARCHAR(100) NOT NULL,
    property_address TEXT NOT NULL,
    zip_code VARCHAR(10),
    sale_date DATE NOT NULL,
    sale_price NUMERIC(15, 2) NOT NULL,
    property_type VARCHAR(255),
    lot_size_acres NUMERIC(10, 4),
    swis_county VARCHAR(50) NOT NULL,
    book VARCHAR(50) NOT NULL,
    page VARCHAR(50) NOT NULL,
    deed_date DATE NOT NULL,
    street_nbr TEXT,
    street_name TEXT,
    prop_class_desc_at_sale TEXT,
    source_checksum VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_data_transaction_composite_id ON sales_data (transaction_composite_id);
CREATE INDEX idx_sales_data_sale_date ON sales_data (sale_date);
CREATE INDEX idx_sales_data_county_muni ON sales_data (county_name, muni_name);
CREATE INDEX idx_sales_data_property_address ON sales_data (property_address);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sales_data_updated_at
BEFORE UPDATE ON sales_data
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
