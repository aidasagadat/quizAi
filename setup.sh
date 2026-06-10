#!/usr/bin/env bash
# QuizAI one-shot dev setup (Linux). Run from repo root.
# Prereqs: Node 20+, npm, running PostgreSQL with a database you've already created.

set -e

echo "==> Installing backend dependencies..."
cd backend
npm install
echo

if [ ! -f .env ]; then
  echo "==> Creating backend/.env from .env.example (EDIT IT before continuing!)"
  cp .env.example .env
  echo "    Edit backend/.env, then re-run this script."
  exit 0
fi

echo "==> Generating Prisma client + running migrations..."
npx prisma migrate dev --name init

echo "==> Seeding demo data..."
npm run db:seed

echo
echo "==> Installing frontend dependencies..."
cd ../frontend
npm install
cd ..

echo
echo "✅  Setup complete."
echo
echo "Start the API:  cd backend  && npm run dev"
echo "Start the web:  cd frontend && npm run dev"
echo
echo "Demo accounts:"
echo "  TEACHER  teacher@demo.com / Teacher#1234"
echo "  STUDENT  student@demo.com / Student#1234"
echo "Open http://localhost:5173"
