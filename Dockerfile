# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installer TOUTES les dépendances (y compris dev pour Nest CLI et Prisma)
RUN npm install --legacy-peer-deps

# Copier le reste du code source
COPY . .

# Générer le build NestJS
RUN npm run build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copier les dépendances et le schéma Prisma
COPY package*.json ./
COPY prisma ./prisma/

# Installer UNIQUEMENT les dépendances de production
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force

# Copier les fichiers compilés depuis l'étape de build
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Démarrage de l'application avec Prisma db push
CMD ["npm", "run", "start:prod"]
