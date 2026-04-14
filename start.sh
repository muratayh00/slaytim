#!/bin/bash
echo "Slaytim.com başlatılıyor..."

# Backend
cd server
npm install
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev &

# Frontend
cd ../client
npm install
npm run dev
