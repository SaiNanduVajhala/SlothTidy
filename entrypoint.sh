#!/bin/sh
set -e

echo "🦥 Starting local Ollama daemon inside Render container..."
ollama serve > /tmp/ollama.log 2>&1 &
OLLAMA_PID=$!

echo "⏳ Waiting for Ollama daemon to become ready..."
for i in $(seq 1 30); do
  if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama daemon ready!"
    break
  fi
  sleep 1
done

echo "⬇️ Pulling open-weight model qwen3:0.6b (or fallback qwen2.5:0.5b)..."
ollama pull qwen3:0.6b || ollama pull qwen2.5:0.5b || echo "⚠️ Model pull notice: will run on demand"

echo "🚀 Starting SlothTidy server on port ${PORT:-3000}..."
exec node server.js
