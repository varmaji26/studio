# Use official Node.js 20 image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json / yarn.lock
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy rest of the code
COPY . .

# Build Next.js app
RUN npm run build

# Expose Cloud Run port
EXPOSE 8080

# Start app on Cloud Run PORT
CMD ["npm", "run", "start"]
