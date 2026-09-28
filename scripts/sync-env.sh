#!/bin/bash
TARGETS=("/" "/workspace")
SOURCE="/app/applet"

for target in "${TARGETS[@]}"; do
  mkdir -p "$target"
  for item in package.json package-lock.json bun.lock tsconfig.json vite.config.ts server.ts eslint.config.js index.html src public scripts node_modules dist; do
    if [ -e "$SOURCE/$item" ]; then
      ln -sf "$SOURCE/$item" "$target/$item" 2>/dev/null || true
    fi
  done
done
