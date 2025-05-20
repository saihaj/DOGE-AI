# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.15.1
FROM node:${NODE_VERSION}-slim

# PNPM configs
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN npm i -g --force pnpm@9.15.2

WORKDIR /app

RUN pnpm install @libsql/client@0.14.0

# Set production environment
ENV NODE_ENV="production"

# Copy the dist folder from local to the container
COPY dist/ .

EXPOSE 3000
CMD [ "node", "./server.js" ]
