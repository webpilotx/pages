#!/bin/bash

git pull
pnpm install
pnpm run build
npx drizzle-kit migrate