# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.12.0
FROM node:${NODE_VERSION}-slim

# Install dependencies for Envoy
RUN apt-get update && apt-get install -y wget ca-certificates && rm -rf /var/lib/apt/lists/*

# Install Envoy (latest version 1.34.0)
RUN wget -O /usr/local/bin/envoy https://github.com/envoyproxy/envoy/releases/download/v1.34.0/envoy-1.34.0-linux-x86_64 && \
    chmod +x /usr/local/bin/envoy

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

# Copy Envoy configuration
COPY envoy.yaml /etc/envoy/envoy.yaml

# Expose ports for agent (3000), chat (3001), and Envoy (8080, 9901)
EXPOSE 3000 3001 8080 9901
