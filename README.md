# Sales Data Synchronization Pipeline

## Objective

Develop a data synchronization pipeline to keep a local PostgreSQL database in sync with weekly updated real estate sales data from a CSV file within a ZIP archive. The pipeline detects and reflects additions, modifications, and deletions, ensuring the database always mirrors the source data.

## Technology Stack

* **Backend/Logic:** NestJS (TypeScript)
* **Database:** PostgreSQL
* **CSV/ZIP Handling:** `csv-parse`, `adm-zip`
* **ORM:** TypeORM
* **Scheduling:** Cron (for Unix/Linux)

## Features & Requirements Met

* **Database Schema:** Normalized PostgreSQL schema (`sales_data` table) with `UUID` primary key, a composite unique identifier (`transaction_composite_id`), and auditing timestamps (`created_at`, `updated_at`).
* **Data Sync Logic:** Implemented to handle:
    * **Insertions:** Adds new records.
    * **Updates:** Detects changes via SHA256 checksums and updates existing records.
    * **Deletions:** Removes records no longer present in the source.
* **Source Data Handling:** Reads and parses CSV data from ZIP files.
* **Automated Scheduling:** Configurable cron job for weekly execution (Unix/Linux).
* **Logging:** Outputs sync results and errors to a log file.

## Expected Deliverables

* `schema.sql`: PostgreSQL database schema definition.
* TypeScript Application Code: All files within `src/` for pipeline logic.
* `cron_setup.sh`: Script for cron job configuration (Unix/Linux).
* `README.md`: This documentation.

## Setup & Run Instructions

### 1. Initial Setup and Dependencies

1.  **Prerequisites:** Ensure you have **Node.js (LTS)**, **npm**, and **PostgreSQL** installed.
2.  **NestJS CLI:** Install globally: `npm install -g @nestjs/cli`
3.  **ts-node:** Install globally (for development runs): `npm install -g ts-node`
4.  **Create Project:**
    ```bash
    nest new sales-data-sync
    cd sales-data-sync
    ```
5.  **Install Dependencies:**
    ```bash
    npm install @nestjs/typeorm pg csv-parse adm-zip crypto fs-extra dotenv
    npm install -D @types/csv-parse @types/adm-zip @types/node @types/fs-extra
    ```
6.  **Environment Variables:** Create `.env` in project root:
    ```
    DB_HOST=localhost
    DB_PORT=5432
    DB_USERNAME=sales_user
    DB_PASSWORD=your_secure_password # <-- IMPORTANT: Use the actual password you set for sales_user
    DB_DATABASE=sales_db
    ```
    *(For version control, create `.env.example` with placeholder values and add `.env` to your `.gitignore`.)*
7.  **Place Code:** Ensure all TypeScript files (`src/data-sync/`, `src/manual-sync.ts`, updated `src/app.module.ts`, etc.) are in place as per the project structure discussed.
8.  **Build Application:**
    ```bash
    npm run build
    ```

### 2. PostgreSQL Setup and Expected Structure

1.  **Create DB & User:** (Connect as PostgreSQL superuser, e.g., `psql -U postgres`)
    ```sql
    CREATE DATABASE sales_db;
    CREATE USER sales_user WITH PASSWORD 'your_secure_password';
    GRANT ALL PRIVILEGES ON DATABASE sales_db TO sales_user;
    GRANT CREATE ON SCHEMA public TO sales_user; # Important for schema creation
    \q
    ```
2.  **Apply Schema:** The `schema.sql` file is provided in the project root.
    ```bash
    # Linux/macOS:
    psql -U sales_user -d sales_db -f schema.sql
    # Windows Git Bash (adjust path if psql is not in PATH):
    "/c/Program Files/PostgreSQL/16/bin/psql.exe" -U sales_user -d sales_db -f schema.sql
    ```
3.  **Expected Structure:** The `sales_data` table will be created as defined in `schema.sql`, ready to store your real estate sales records with a focus on unique transaction identification, data integrity, and change tracking.


### 3. Running the Sync Manually (Demonstration)

This section demonstrates how to run the sync pipeline against dummy data to verify insertions, updates, and deletions. Follow these steps in order:

1. **Generate Dummy Data**

   ```bash
   node create-dummy-data.js
   ```

   This creates ZIP files in `dummy_data/`:

   * `0122_CUR_Source_V1.zip`
   * `0122_CUR_Source_V2.zip`

2. **Prepare the Database** (Optional but recommended for a clean test)

   ```bash
   # Truncate the table and reset primary key sequence
   psql -U sales_user -d sales_db \
     -c "TRUNCATE TABLE sales_data RESTART IDENTITY;"
   ```

3. **Test Sequence**

   | Step | Action             | Command                                                          | Expected Result                                                            |
   | ---- | ------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
   | 1    | **Initial Load**   | `ts-node src/manual-sync.ts ./dummy_data/0122_CUR_Target.zip`    | Inserts \~50 records (no updates or deletions)                             |
   | 2    | **No-Change Sync** | `ts-node src/manual-sync.ts ./dummy_data/0122_CUR_Source_V1.zip` | No changes (0 inserts, 0 updates, 0 deletions)                             |
   | 3    | **Delta Sync**     | `ts-node src/manual-sync.ts ./dummy_data/0122_CUR_Source_V2.zip` | Applies adds, updates, deletions (\~5 inserts, \~2 updates, \~2 deletions) |

4. **Verify Results** After each run, query the database:

   ```sql
   -- Check total records
   SELECT count(*) FROM sales_data;

   -- View most recent changes
   SELECT *
   FROM sales_data
   ORDER BY updated_at DESC
   LIMIT 10;
   ```

5. **Sync Summary Output** Each run prints a JSON summary, for example:

   ```json
   {
     "inserted": 50,
     "updated": 0,
     "deleted": 0,
     "errors": 0
   }
   ```

Now you can confirm that the pipeline correctly handles insertions, detects no changes when the source is identical, and processes deltas (additions, modifications, deletions) as expected.

### 4. Scheduling via Cron (for Unix/Linux System)

This step outlines how to set up the weekly automated execution of your sync pipeline on a Unix/Linux server.

1.  **Save `cron_setup.sh`:** Save the script (your version from our conversation) in your project root.
2.  **Configure `cron_setup.sh`:** **IMPORTANT:** Open `cron_setup.sh` and **edit the variables** `APP_DIR`, `NODE_PATH`, and `SOURCE_ZIP_FILE` to reflect the **absolute Linux paths** appropriate for your deployment environment (e.g., `APP_DIR="/home/youruser/sales-data-sync"`, `NODE_PATH="/usr/bin/node"`, `SOURCE_ZIP_FILE="/path/to/weekly/0122_CUR_Source.ZIP"`).
3.  **Make Executable & Run:**
    ```bash
    chmod +x cron_setup.sh
    ./cron_setup.sh
    ```
    This command will add a weekly cron job (typically scheduled for Sunday at 02:00 AM) that executes your compiled `manual-sync.js` script.
4.  **Monitor Logs:** The output of the cron job will be directed to `${APP_DIR}/logs/sales_sync.log`. You can monitor it using `tail -f ${APP_DIR}/logs/sales_sync.log`.
5.  **Log Rotation (Recommended):** Consider setting up `logrotate` for `sales_sync.log` to manage log file sizes over time (instructions are commented within `cron_setup.sh`).