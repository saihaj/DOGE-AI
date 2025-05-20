ARG NODE_VERSION=22.15.1
FROM node:${NODE_VERSION}-slim

RUN apt-get update && apt-get install -y ca-certificates openssl && rm -rf /var/lib/apt/lists/*

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

# Expose ports for agent (3000), chat (3001)
EXPOSE 3000 3001
