#!/bin/bash
cd /var/www/html/tradingx.alichv.com/frontend || exit
git pull
npm install
npm run build
pm2 restart tradingx-front
