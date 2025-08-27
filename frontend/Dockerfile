#Dockerfile for Frontend, using Vite + TailwindCSS in rootless

FROM node:20-alpine AS build

# Set working directory and ensure it's owned by node
WORKDIR /app
RUN chown -R node:node /app

#use the pre-created non-root user "node" with uid 1000
USER node

#install dependencies
COPY --chown=node:node package*.json ./
RUN npm ci

#pass API URL at build time so Vite bakes it into the bundle
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

#copy source
COPY --chown=node:node . .

RUN npm run build

#runtime (nginx, unprivileged, port 8081)
FROM nginxinc/nginx-unprivileged:1.27.0-alpine AS runtime

#nginx user is uid 101 in this image
COPY --chown=101:101 --from=build /app/dist /usr/share/nginx/html

EXPOSE 8081

CMD ["/docker-entrypoint.sh", "nginx", "-g", "daemon off;"]