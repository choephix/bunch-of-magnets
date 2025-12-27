#!/bin/bash

# 1. Define input and output
CONFIG_FILE=".app.config.json"
ENV_FILE=".env.local"
ENV_VAR_NAME="APP_CONFIG_BASE64"

# 2. Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: $CONFIG_FILE not found."
  exit 1
fi

# 3. Minify JSON and Base64 encode it
# We use python3 for JSON minification to avoid installing 'jq' dependency
PAYLOAD=$(cat "$CONFIG_FILE" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin), separators=(',', ':')))" | base64 | tr -d '\n')

# 4. Update .env file based on OS (Linux vs Mac/BSD sed differences)
if [ ! -f "$ENV_FILE" ]; then
  touch "$ENV_FILE"
fi

# Check if the var exists in .env
if grep -q "^$ENV_VAR_NAME=" "$ENV_FILE"; then
  # If it exists, replace the line (compatible with Mac and Linux)
  sed -i.bak "s|^$ENV_VAR_NAME=.*|$ENV_VAR_NAME=\"$PAYLOAD\"|" "$ENV_FILE" && rm "$ENV_FILE.bak"
else
  # If it doesn't exist, append it
  echo "$ENV_VAR_NAME=\"$PAYLOAD\"" >> "$ENV_FILE"
fi

echo "✅ Updated $ENV_FILE with compressed Base64 config."
