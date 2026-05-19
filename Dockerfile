FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

# --- Frontend build ---
COPY frontend/package.json frontend/package-lock.json ./frontend/
WORKDIR /app/frontend
RUN npm ci --ignore-scripts

COPY frontend/ ./
RUN npm run build

# --- Backend build ---
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./backend/
WORKDIR /app/backend
RUN npm ci --ignore-scripts

COPY backend/ ./
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]
