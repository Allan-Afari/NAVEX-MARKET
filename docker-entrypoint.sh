#!/bin/sh
set -e

# Generate a small JS file that exposes runtime env vars to the frontend
ENV_FILE="/usr/share/nginx/html/env-config.js"

echo "window._env_ = {" > "$ENV_FILE"
echo "  VITE_SUPABASE_URL: \"${VITE_SUPABASE_URL:-}\"," >> "$ENV_FILE"
echo "  VITE_SUPABASE_PUBLISHABLE_KEY: \"${VITE_SUPABASE_PUBLISHABLE_KEY:-}\"," >> "$ENV_FILE"
echo "  VITE_SUPABASE_PROJECT_ID: \"${VITE_SUPABASE_PROJECT_ID:-}\"" >> "$ENV_FILE"
echo "};" >> "$ENV_FILE"

echo "Generated runtime env file at $ENV_FILE"

# Start nginx in foreground
exec nginx -g "daemon off;"
