-- Drop table if it exists to allow for clean re-creation during development
-- In a production environment, you would use ALTER TABLE for schema changes
-- or migration tools, not DROP/CREATE.
DROP TABLE IF EXISTS sales_data CASCADE;

-- Create sales_data table
CREATE TABLE sales_data (
    -- Internal Primary Key: A unique identifier for each record in our database.
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Business Key / Natural Key: Derived from source columns to uniquely identify a sale.
    -- This key is crucial for detecting updates and deletions from the CSV source.
    -- Concatenating swis_county, book, page, and deed_date.
    -- Example: "1-11590-2024-07-17"
    transaction_composite_id VARCHAR(255) UNIQUE NOT NULL,

    -- Core Data Fields extracted from 0122_CUR.CSV
    county_name VARCHAR(100) NOT NULL,
    muni_name VARCHAR(100) NOT NULL, -- Storing as VARCHAR as it appears to be a code
    property_address TEXT NOT NULL, -- Formed by concatenating street_nbr and street_name
    zip_code VARCHAR(10), -- Using 'zip5', can be NULL
    sale_date DATE NOT NULL,
    sale_price NUMERIC(15, 2) NOT NULL,
    property_type VARCHAR(255), -- From 'prop_class_desc_at_sale'
    lot_size_acres NUMERIC(10, 4), -- From 'total_sale_acres'

    -- Raw identifier components (for traceability and re-creating composite ID)
    swis_county VARCHAR(50) NOT NULL,
    book VARCHAR(50) NOT NULL,
    page VARCHAR(50) NOT NULL,
    deed_date DATE NOT NULL,
    street_nbr TEXT,
    street_name TEXT,
    prop_class_desc_at_sale TEXT, -- Keep original for checksum and debugging

    -- Change Tracking / Auditing Fields
    source_checksum VARCHAR(64), -- SHA256 of relevant data for change detection
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient lookups and performance
CREATE INDEX idx_sales_data_transaction_composite_id ON sales_data (transaction_composite_id);
CREATE INDEX idx_sales_data_sale_date ON sales_data (sale_date);
CREATE INDEX idx_sales_data_county_muni ON sales_data (county_name, muni_name);
CREATE INDEX idx_sales_data_property_address ON sales_data (property_address);


-- Trigger to automatically update the 'updated_at' column on row modification.
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