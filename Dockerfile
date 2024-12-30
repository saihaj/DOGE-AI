# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.12.0
FROM node:${NODE_VERSION}-slim as base

# PNPM configs
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Set production environment
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp openssl pkg-config python-is-python3

# Copy contents of the root
COPY . .

# Install node modules
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod 
RUN pnpm deploy --filter=crawler --prod /prod/crawler

FROM base AS crawler
COPY --from=build /prod/crawler /prod/crawler
WORKDIR /prod/crawler
RUN npx prisma generate

# Install packages needed for deployment
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives
EXPOSE 3000

CMD [ "pnpm", "start" ]
