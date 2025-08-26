#backend Dockerfile (production, rootless)
FROM node:20-alpine
WORKDIR /app

#install dependencies as non-root
COPY --chown=node:node package*.json ./
USER node
RUN npm ci --omit=dev

#copy source
COPY --chown=node:node . .

EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=2s --retries=5 CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["npm", "start"]