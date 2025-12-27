#!/bin/bash

# 1. Define input and output
ENV_FILE=".env.local"
CONFIG_FILE=".app.config.json"
ENV_VAR_NAME="APP_CONFIG_BASE64"

# 2. Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found."
  exit 1
fi

# 3. Extract the Base64 string
LINE=$(grep "^$ENV_VAR_NAME=" "$ENV_FILE" | head -n 1)

if [ -z "$LINE" ]; then
  echo "Error: $ENV_VAR_NAME not found in $ENV_FILE."
  exit 1
fi

# Extract value after the first '='
VALUE="${LINE#*=}"

# Remove surrounding double quotes if present
VALUE="${VALUE%\"}"
VALUE="${VALUE#\"}"

# 4. Decode Base64 and format JSON
# We use python3 to decode and pretty-print JSON to avoid 'jq' and OS-specific base64 flags
if ! command -v python3 &> /dev/null; then
  echo "Error: python3 is required but not installed."
  exit 1
fi

echo "$VALUE" | python3 -c "import sys, json, base64; print(json.dumps(json.loads(base64.b64decode(sys.stdin.read().strip()).decode('utf-8')), indent=2))" > "$CONFIG_FILE"

echo "✅ Restored $CONFIG_FILE from $ENV_FILE."
