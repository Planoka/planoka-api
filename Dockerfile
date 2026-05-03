# ─── Étape de Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Installer OpenSSL (requis par Prisma sur Alpine Linux)
RUN apk add --no-cache openssl

# Copier les fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installer TOUTES les dépendances (nécessaire pour avoir @nestjs/cli pour le build)
RUN npm install --legacy-peer-deps

# Générer le client Prisma
RUN npx prisma generate

# Copier le reste du code
COPY . .

# Compiler l'application NestJS
RUN npm run build

# ─── Étape de Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Installer OpenSSL (requis par Prisma sur Alpine Linux)
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Copier les dépendances et le schéma
COPY package*.json ./
COPY prisma ./prisma/

# Installer UNIQUEMENT les dépendances de production
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force

# Copier le build et le client Prisma généré depuis l'étape précédente
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Le script start:prod contient déjà "npx prisma db push && node dist/main"
CMD ["npm", "run", "start:prod"]
