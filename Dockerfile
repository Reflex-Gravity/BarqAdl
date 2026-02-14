# -- build stage --
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# -- runtime stage --
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/
COPY prompts/ ./prompts/
COPY data/ ./data/

EXPOSE 3001
CMD ["node", "src/index.js"]
