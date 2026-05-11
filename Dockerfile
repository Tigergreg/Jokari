# ============================================================
# Jokari Club Zürich — multi-stage image
# Stage 1: install Node API deps
# Stage 2: nginx (static) + node (API) running together via a tiny supervisor
# Exposes :8080 (required by Cloud Run). Nginx terminates HTTP and proxies
# /api/* to Node on :3000 inside the container.
# ============================================================

# ---------- Stage 1 — Node API build ----------
FROM node:20-alpine AS api-build
WORKDIR /app/api
COPY api/package*.json ./
RUN npm ci --omit=dev
COPY api/ ./

# ---------- Stage 2 — Runtime: nginx + node ----------
FROM nginx:1.27-alpine

# Install Node.js into the nginx image so we can run both processes
RUN apk add --no-cache nodejs npm

# Frontend
COPY src/ /usr/share/nginx/html/

# Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# API
COPY --from=api-build /app/api /opt/api

# Tiny supervisor — start the Node API, then nginx in the foreground
RUN printf '#!/bin/sh\nset -e\ncd /opt/api && PORT=3000 node server.js &\nexec nginx -g "daemon off;"\n' > /start.sh \
 && chmod +x /start.sh

# Cloud Run sends traffic to whatever PORT env var says; default 8080
ENV PORT=8080
EXPOSE 8080

CMD ["/start.sh"]
