# Multi-stage build for React/Vite application

# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application
FROM node:20-alpine AS runner

WORKDIR /app

# Install vite as a dependency for preview mode
RUN npm install -g vite@latest

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/vite.config.js ./

# Expose port 3072
EXPOSE 3072

# Start vite preview server
CMD ["vite", "preview", "--host", "0.0.0.0", "--port", "3072"]
