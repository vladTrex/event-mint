FROM node:20.5.1-alpine

WORKDIR /account

# Copy package files
COPY package*.json ./

# Clean npm cache and install global dependencies
RUN npm cache clean --force
RUN npm install -g @nestjs/cli ts-node

# Install project dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port (configurable via HTTP_PORT env variable)
EXPOSE 9000

# Start the application
CMD ["npm", "run", "start:prod"]

