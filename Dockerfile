# ==========================================
# Stage 1: Build static Next.js frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Serve using FastAPI Backend
# ==========================================
FROM python:3.11-slim
WORKDIR /app/backend

# Install system dependencies for PostgreSQL compilation if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy FastAPI backend code
COPY backend/app ./app

# Copy built frontend static HTML assets into FastAPI static directory
COPY --from=frontend-builder /app/frontend/out ./static

# Configure environment defaults for Cloud Run SQLite execution
ENV DATABASE_URL="sqlite:///./ledgerly.db"
ENV PORT=8080

EXPOSE 8080

CMD ["python", "app/main.py"]
