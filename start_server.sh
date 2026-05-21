#!/usr/bin/env bash

# Ensure we are in the script directory
cd "$(dirname "$0")" || exit 1

# Start the offline API and Vite dev server on 127.0.0.1:4174 / 127.0.0.1:4173.
npm run dev:offline
