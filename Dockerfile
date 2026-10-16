# syntax=docker/dockerfile:1

FROM node:22-slim AS build

ARG BUILD_MODE=kiosk
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_KIOSK_SECRET
ARG VITE_BOARD_URL

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN case "$BUILD_MODE" in kiosk|board) ;; *) \
      echo "BUILD_MODE must be 'kiosk' or 'board', got '$BUILD_MODE'" >&2; exit 1; \
    esac \
 && [ -n "$VITE_SUPABASE_URL" ] || { echo "VITE_SUPABASE_URL build arg is required" >&2; exit 1; } \
 && [ -n "$VITE_SUPABASE_ANON_KEY" ] || { echo "VITE_SUPABASE_ANON_KEY build arg is required" >&2; exit 1; } \
 && if [ "$BUILD_MODE" = "kiosk" ]; then \
      [ -n "$VITE_KIOSK_SECRET" ] || { echo "VITE_KIOSK_SECRET build arg is required for the kiosk build" >&2; exit 1; }; \
    fi \
 && printf 'VITE_SUPABASE_URL=%s\nVITE_SUPABASE_ANON_KEY=%s\nVITE_KIOSK_SECRET=%s\nVITE_BOARD_URL=%s\n' \
      "$VITE_SUPABASE_URL" "$VITE_SUPABASE_ANON_KEY" "$VITE_KIOSK_SECRET" "$VITE_BOARD_URL" > ".env.$BUILD_MODE" \
 && npm run "build:$BUILD_MODE" \
 && cp -r "dist-$BUILD_MODE" /app/out

FROM nginx:1.29-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/out /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
