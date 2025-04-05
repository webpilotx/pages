#!/bin/bash

git pull
pnpm install
pnpm run build
npx drizzle-kit migrate
systemctl --user daemon-reload
systemctl --user restart pages.service