# Running QuizAI with Docker

The whole stack (Postgres + backend + frontend) runs in containers. One command brings everything up.

## Prerequisites

- Docker Engine + Docker Compose v2 (`docker compose version` should work)
- ~2 GB free disk space for images and DB volume

Install on Ubuntu/Debian:
```bash
sudo apt install docker.io docker-compose-plugin
sudo usermod -aG docker $USER   # log out and back in after this
```

## 1. Configure secrets

From the repo root:
```bash
cp .env.example .env
```

Edit `.env`:
- `OPENAI_API_KEY` — paste your key
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` — generate strong values:
  ```bash
  openssl rand -hex 64
  ```

## 2. Build and start

```bash
docker compose up -d --build
```

First time: 3–5 min (builds two images, pulls Postgres, applies migrations on boot).

Check it's healthy:
```bash
docker compose ps
```

You should see `quizai-db`, `quizai-backend`, `quizai-frontend` all running.

## 3. Seed demo data

```bash
docker compose run --rm seed
```

Output ends with the demo credentials.

## 4. Open it

- **App:** http://localhost:8080
- **API docs (Swagger):** http://localhost:4000/api/v1/docs
- **Postgres:** `localhost:5433` (port `5433` — to avoid clash with your local Postgres on `5432`), user `quizai`, password `quizai`, db `quizai`

Demo accounts after seeding:
- Teacher: `teacher@demo.com` / `Teacher#1234`
- Student: `student@demo.com` / `Student#1234`

## Useful commands

| Command | What |
|---|---|
| `docker compose up -d` | Start everything in the background |
| `docker compose down` | Stop and remove containers (keeps DB volume) |
| `docker compose down -v` | Stop AND wipe the DB volume |
| `docker compose logs -f backend` | Follow backend logs (and where you'll see the OTP/reset emails) |
| `docker compose logs -f frontend` | Follow frontend (nginx) logs |
| `docker compose restart backend` | Restart just the backend after code changes |
| `docker compose up -d --build` | Rebuild images and restart (after code changes) |
| `docker compose exec db psql -U quizai` | Connect to the Postgres CLI |

## Architecture

```
┌───────────────────┐  port 8080   ┌────────────────┐
│  Browser          │ ───────────► │  frontend      │
└───────────────────┘              │  nginx :80     │
                                   │  /api/* proxy ─┼──┐
                                   └────────────────┘  │
                                                       │ internal :4000
                                                       ▼
                                            ┌──────────────────┐
                                            │  backend         │
                                            │  NestJS :4000    │
                                            └────────┬─────────┘
                                                     │
                                            internal │ :5432
                                                     ▼
                                            ┌──────────────────┐
                                            │  db              │
                                            │  Postgres        │
                                            └──────────────────┘
```

- The browser only talks to `localhost:8080`. All API calls go through nginx, which proxies `/api/*` to the backend.
- The backend talks to Postgres over the internal Docker network using the hostname `db`.
- The DB lives in a named volume `postgres-data` so it survives `docker compose down`.
- Uploads live in `backend-uploads` volume.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Port 5433 / 8080 / 4000 already in use | Edit the `ports:` mapping in `docker-compose.yml` to a free port. |
| Backend keeps restarting | `docker compose logs backend` — usually a missing env var. |
| Schema changed and I want a fresh DB | `docker compose down -v && docker compose up -d --build && docker compose run --rm seed` |
| Want to develop with hot reload | Use the non-Docker dev setup in the main README; Docker is for clean reproducible runs. |
