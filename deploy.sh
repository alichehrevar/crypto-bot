#!/bin/bash

set -e  # Exit on any error

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use default

cd "$DEPLOY_PATH"

echo "🔄 Git stash..."
git stash

echo "🔄 Pulling latest code..."
git pull

echo "📦 Installing dependencies..."
npm install --legacy-peer-deps --loglevel=info

echo "🔨 Building the frontend..."
npm run build

echo "🚀 Restarting PM2 process..."
pm2 restart tradingx-front

