#!/usr/bin/bash

pnpm install
pnpm run build
pnpm drizzle-kit migrate

# Define environment variables
export PORT=6004

# Define log file path
LOG_FILE="production.log"

# Kill any process using the specified port
echo "Checking for processes using port $PORT..."
PIDS=$(lsof -t -i:$PORT)
if [ -n "$PIDS" ]; then
  echo "Killing processes using port $PORT..."
  echo "$PIDS" | xargs kill -9
else
  echo "No process found using port $PORT."
fi

# Run the application and log output
nohup node index.js > "$LOG_FILE" 2>&1 &
echo "Application started in production mode. Logs are being written to $LOG_FILE"
