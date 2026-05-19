FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY backend/package.json backend/package-lock.json ./backend/
WORKDIR /app/backend
RUN npm ci --ignore-scripts

COPY backend/ ./
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3333

CMD ["npm", "run", "start"]
