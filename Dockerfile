FROM ubuntu:24.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    procps \
    unzip \
    ffmpeg \
    libvips-dev \
    imagemagick \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.sh/install | bash -s -- canary
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY fixtures/ fixtures/
COPY src/ src/
COPY tsconfig.json ./

ENTRYPOINT ["bun", "run", "src/index.ts"]
