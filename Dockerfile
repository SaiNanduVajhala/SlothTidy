FROM node:20-bookworm-slim

# Install system dependencies, curl, ca-certificates, and procps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Install official Ollama runtime
RUN curl -fsSL https://ollama.com/install.sh | sh

WORKDIR /app

# Install npm dependencies
COPY package*.json ./
RUN npm install

# Copy application files and startup script
COPY . .
RUN chmod +x ./entrypoint.sh

ENV PORT=3000
ENV NODE_ENV=production
ENV OLLAMA_HOST=http://127.0.0.1:11434

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
