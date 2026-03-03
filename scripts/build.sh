#!/usr/bin/env bash

set -euxo pipefail

if [ -d "dist" ]; then
  rm -rf dist
fi

npm run lingui:compile
npm run build:frontend
npm run build:backend
