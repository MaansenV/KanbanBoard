#!/usr/bin/env bash

# Ensure we are in the script directory
cd "$(dirname "$0")" || exit 1

# Start Vite dev server on 127.0.0.1:4173 with strict port
npm run dev -- --host 127.0.0.1 --port 4173 --strictPort --clearScreen false

