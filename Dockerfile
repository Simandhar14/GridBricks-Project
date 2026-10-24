# ==============================================================================
# Stage 1: Build Frontend Assets
# ==============================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

# Install dependencies
COPY frontend/package.json ./
RUN npm install --no-audit

# Build production assets
COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Python Backend & Static SPA Runtime (Single Container)
# ==============================================================================
FROM python:3.12-slim AS runner

# Security & Python optimization flags
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production \
    PORT=8000 \
    DATA_DIR=backend/data

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code and snapshots
COPY backend/ ./backend/

# Copy compiled frontend from Stage 1 into the runtime image
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

# Security: Non-root user
RUN adduser --disabled-password --gecos "" appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Honour Heroku $PORT dynamic environment variable with fallback to 8000
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

