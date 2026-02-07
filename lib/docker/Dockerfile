ARG NODE_VERSION=18
FROM node:${NODE_VERSION}-alpine

# Set working directory
WORKDIR /app

# Copy the bundled application code
# The code is already bundled by esbuild, no npm install needed
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "index.js"]
