# Dockerfile for Node.js App
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the frontend and backend
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
