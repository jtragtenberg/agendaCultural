FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY prisma ./prisma
COPY src ./src

EXPOSE 3000
CMD ["sh", "-c", "npx prisma generate && npx prisma db push && npm run prisma:seed && npm run start"]
