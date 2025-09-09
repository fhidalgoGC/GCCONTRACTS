# Use Node.js 20 on Ubuntu for better compatibility with esbuild
FROM node:20

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

RUN npm install -g npm@11.5.2
# Install dependencies
RUN npm install

# Copy all source code
COPY . .

# Update browserslist database
RUN npx update-browserslist-db@latest

# Build the application
RUN npm run build

# Clean up after build - keep vite and related dependencies for runtime
RUN npm cache clean --force

# Create non-root user for security
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port 5000
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000 || exit 1

# Start the application
CMD ["npm", "start"]