#!/bin/bash

set -e  # Exit on any error

cd "$DEPLOY_PATH"

echo "🔄 Pulling latest code..."
git pull

echo "📦 Installing dependencies..."
npm install --legacy-peer-deps --loglevel=info

echo "🔨 Building the frontend..."
npm run build -- --debug

echo "🚀 Restarting PM2 process..."
pm2 restart tradingx-front
