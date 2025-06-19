# --- Configuration Variables ---
# IMPORTANT: Adjust these paths to match your deployment environment!

# For demonstration, you might use your current project root, but for production, this should be a stable path.
APP_DIR="C:\Users\Dell\Desktop\personal\sales-data-sync" # <--- IMPORTANT: SET YOUR ABSOLUTE PROJECT PATH HERE


NODE_PATH="C:\nvm4w\nodejs\node.exe"        

SOURCE_ZIP_FILE="${APP_DIR}/dummy_data/0122_CUR_Source_V2.zip" # <--- IMPORTANT: SET PATH TO YOUR WEEKLY ZIP

LOG_DIR="${APP_DIR}/logs" 
LOG_FILE="${LOG_DIR}/sales_sync.log"

# --- Setup Steps ---

echo "Setting up cron job for Sales Data Sync Pipeline..."

# 1. Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"
echo "Log directory created: $LOG_DIR"

# 2. Ensure the log file exists and has correct permissions
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"
echo "Log file created: $LOG_FILE"

# 3. Build the NestJS application (if not already built)
# This ensures the latest JS code is in the 'dist' directory.
echo "Building NestJS application..."
(cd "$APP_DIR" && npm install --silent && npm run build --silent) >> "$LOG_FILE" 2>&1
if [ $? -eq 0 ]; then
    echo "NestJS application built successfully."
else
    echo "Error: NestJS application build failed. Check $LOG_FILE for details."
    exit 1
fi


SYNC_SCRIPT_PATH="${APP_DIR}/dist/main.js"


CRON_JOB_COMMAND="cd ${APP_DIR} && ${NODE_PATH} ${SYNC_SCRIPT_PATH} ${SOURCE_ZIP_FILE} >> ${LOG_FILE} 2>&1"


SCHEDULE="0 2 * * 0"

(crontab -l 2>/dev/null | grep -v -F "${SYNC_SCRIPT_PATH}" ; echo "${SCHEDULE} ${CRON_JOB_COMMAND}") | crontab -

echo "Cron job added successfully to run ${SCHEDULE}."
echo "Sync command: ${CRON_JOB_COMMAND}"
echo "Logs will be written to: ${LOG_FILE}"

echo -e "\n--- Log Rotation Setup  ---"
echo "For managing log file sizes, consider setting up log rotation using 'logrotate'."
echo "You'll need root privileges for this. Create a file like /etc/logrotate.d/sales-sync-logrotate"
echo "with the following content:"
echo "---------------------------------------------------"
cat <<EOF
${LOG_FILE} {
    weekly
    missingok
    rotate 4
    compress
    delaycompress
    notifempty
    create 0644 root root
    # If the app needs to be restarted after log rotation (unlikely for our script, but common for long-running services)
    # postrotate
    #     systemctl reload my-sales-sync-service # Example
    # endscript
}
EOF
echo "---------------------------------------------------"
echo "After creating the file (e.g., sudo nano /etc/logrotate.d/sales-sync-logrotate), ensure it has correct permissions (e.g., sudo chmod 644 /etc/logrotate.d/sales-sync-logrotate)."
echo "Then, logrotate will automatically pick it up."