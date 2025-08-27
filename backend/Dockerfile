#backend Dockerfile (production, rootless)
FROM node:20-alpine
WORKDIR /app

# Install curl as root
RUN apk add --no-cache curl

# Ensure /app is owned by node before switching user
RUN chown -R node:node /app

# Install dependencies as non-root
COPY --chown=node:node package*.json ./
USER node
RUN npm ci --omit=dev

# Copy source
COPY --chown=node:node . .

EXPOSE 3000

CMD ["npm", "start"]