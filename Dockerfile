# Use Node 22 for the current React/Vite toolchain
FROM node:22-alpine

WORKDIR /app

# Copy package metadata first for better Docker layer caching
COPY package*.json npm-shrinkwrap.json* ./

# Install PM2 globally
RUN npm install -g pm2

# Install all dependencies including build-time devDependencies.
# npm install is kept because this repository's package-lock is regenerated
# as part of dependency refreshes rather than enforced with npm ci here.
RUN npm install

COPY . .

# Build the application (TypeScript + Vite)
RUN npm run build

EXPOSE 4000

CMD ["pm2-runtime", "start", "npm", "--", "start"]
