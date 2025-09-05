# ----------------
# 1. Build Stage
# ----------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Build Next.js app
RUN npm run build

# ----------------
# 2. Run Stage
# ----------------
FROM node:20-alpine

WORKDIR /app

# Copy only what is needed for runtime
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Cloud Run exposes 8080
EXPOSE 8080

# Start server on Cloud Run PORT
CMD ["npm", "run", "start"]
