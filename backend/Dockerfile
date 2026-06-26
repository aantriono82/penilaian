FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3002
ENV DB_PATH=/app/data/atiga-asesmen.db

EXPOSE 3002

CMD ["npm", "start"]
