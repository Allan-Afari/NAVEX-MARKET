# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app

# Accept build arguments for Supabase configuration
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build with environment variables
RUN VITE_SUPABASE_URL="${VITE_SUPABASE_URL}" \
    VITE_SUPABASE_PUBLISHABLE_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY}" \
    VITE_SUPABASE_PROJECT_ID="${VITE_SUPABASE_PROJECT_ID}" \
    npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint for runtime env templating
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
