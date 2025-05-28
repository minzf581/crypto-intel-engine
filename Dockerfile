# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --prefer-offline --no-audit --silent
RUN cd server && npm ci --prefer-offline --no-audit --silent
RUN cd client && npm ci --prefer-offline --no-audit --silent

# Copy source code
COPY . .

# Build the application
RUN cd server && npm run build
RUN cd client && npm run build

# Create necessary directories
RUN mkdir -p server/data logs

# Expose port
EXPOSE 5001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5001/health || exit 1

# Start the application
CMD ["npm", "start"] 