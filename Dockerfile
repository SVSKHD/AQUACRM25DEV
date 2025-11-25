# Use a specific version of node on Alpine for a smaller image size
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or npm-shrinkwrap.json) first for better caching
COPY package*.json npm-shrinkwrap.json* ./

# Install PM2 globally
RUN npm install -g pm2

# Install ALL dependencies including devDependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application (tsc + vite)
RUN npm run build

# Expose the port the app runs on
EXPOSE 4000

# Command to run the application using PM2
CMD ["pm2-runtime", "start", "npm", "--", "start"]