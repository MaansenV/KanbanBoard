#!/usr/bin/env bash

URL="http://127.0.0.1:4173/"

# Cross-platform opener
case "$OSTYPE" in
  darwin*) open "$URL" ;;
  linux*) xdg-open "$URL" >/dev/null 2>&1 ;;
  msys*|cygwin*|win32*) cmd.exe /c start "" "$URL" ;;
  *) echo "Open $URL manually (unsupported platform: $OSTYPE)" ;;
esac

