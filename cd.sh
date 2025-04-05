#!/usr/bin/bash

pnpm install
pnpm run build
npx drizzle-kit migrate

# Define environment variables
export NODE_ENV=production
export PORT=5004

# Define log file path
LOG_FILE="production.log"

# Kill any process using the specified port
echo "Checking for processes using port $PORT..."
PID=$(lsof -t -i:$PORT)
if [ -n "$PID" ]; then
  echo "Killing process $PID using port $PORT..."
  kill -9 $PID
else
  echo "No process found using port $PORT."
fi

# Run the application and log output
nohup node index.js > "$LOG_FILE" 2>&1 &
echo "Application started in production mode. Logs are being written to $LOG_FILE"
