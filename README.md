# QuizAI

AI-powered platform for teachers and students. Teachers upload materials (PDF/DOCX/text), generate Bloom's Taxonomy–aligned quizzes with GPT, assemble them into tests, assign to student groups, and analyze results. Students join via invite code, take quizzes online, see results with explanations, and get topic-level recommendations.

**Stack:** NestJS · Prisma · PostgreSQL · OpenAI · React (Vite) · TypeScript · Tailwind · Recharts.

---

## Quick start (Linux)

You said PostgreSQL is already installed locally. The whole project can be running in about 5 minutes.

### 1. Prerequisites

```bash
node -v    # need ≥ 20
psql --version   # PostgreSQL ≥ 14
```

If you don't have Node 20+, install via [nvm](https://github.com/nvm-sh/nvm):
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
source ~/.bashrc
nvm install 20
```

### 2. Create the database

```bash
sudo -u postgres psql
```
Then inside `psql`:
```sql
CREATE DATABASE quizai;
CREATE USER quizai WITH PASSWORD 'quizai';
GRANT ALL PRIVILEGES ON DATABASE quizai TO quizai;
\c quizai
GRANT ALL ON SCHEMA public TO quizai;
\q
```

### 3. Configure environment

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and edit:
- `DATABASE_URL` — should already match if you used the credentials above.
- `OPENAI_API_KEY` — paste your real key.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — generate strong values:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
  Run it twice, paste each output as one secret.

### 4. Install + migrate + seed (one command)

From repo root:
```bash
./setup.sh
```

This runs `npm install` in both packages, applies Prisma migrations, and seeds demo accounts.

If you prefer manual steps:
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run db:seed

cd ../frontend
npm install
```

### 5. Run

Open two terminals:

```bash
# Terminal 1 — backend on :4000
cd backend
npm run dev
```

```bash
# Terminal 2 — frontend on :5173
cd frontend
npm run dev
```

Open **http://localhost:5173**.

### 6. Log in with demo accounts

| Role    | Email              | Password         |
|---------|--------------------|------------------|
| Teacher | teacher@demo.com   | Teacher#1234     |
| Student | student@demo.com   | Student#1234     |

The student is pre-joined to a "Demo Class" group (invite code: `DEMO01`) and already has a sample quiz assigned. You can also register new accounts via `/register`.

---

## Project structure

```
quizai/
├── backend/                       NestJS API
│   ├── prisma/
│   │   ├── schema.prisma          Full DB schema (15 models, 8 enums)
│   │   └── seed.ts                Demo teacher, student, group, quiz
│   ├── src/
│   │   ├── main.ts                Bootstrap + Swagger + CORS
│   │   ├── app.module.ts          Wires all modules
│   │   ├── prisma/                Prisma global service
│   │   ├── auth/                  Register · login · refresh · JWT strategy
│   │   ├── users/                 /users/me
│   │   ├── sources/               Upload PDF/DOCX · paste text · parse
│   │   ├── ai/                    OpenAI generation pipeline
│   │   ├── questions/             Generate · CRUD · accept/discard
│   │   ├── tests/                 Assemble tests from question bank
│   │   ├── groups/                Teacher create · student join by code
│   │   ├── assignments/           Assign test to groups · deadlines
│   │   ├── attempts/              Start · auto-save · submit · grade · recommend
│   │   ├── analytics/             Teacher overview · assignment · student progress
│   │   ├── exports/               PDF · DOCX · Google Forms JSON
│   │   └── common/                Decorators + guards
│   └── .env.example
│
├── frontend/                      Vite + React + TS + Tailwind
│   └── src/
│       ├── main.tsx               Router
│       ├── lib/api.ts             Axios + auto-refresh
│       ├── store/auth.ts          Zustand auth store (persisted)
│       ├── components/
│       │   ├── Layout.tsx         Sidebar shell (role-aware)
│       │   └── ProtectedRoute.tsx
│       └── pages/
│           ├── Landing · Login · Register
│           ├── teacher/           Dashboard · Sources · Generate · QuestionBank · Tests · TestEditor · Groups · Assignments · Analytics · AssignmentAnalytics
│           └── student/           Dashboard · Groups · TakeQuiz · Result · History · Progress
│
├── setup.sh                       One-command install + migrate + seed
└── README.md
```

---

## What's implemented

### Teacher
- Register / login / JWT auth with rotating refresh tokens
- Upload PDF or DOCX → text extracted with `pdf-parse` / `mammoth`
- Paste raw text source
- Generate questions: MCQ, True/False, Short Answer, Fill-in-the-Blank
- Pick Bloom's Taxonomy levels (REMEMBER → CREATE), distribute across them
- AI pipeline: text segmentation, JSON-mode prompting, structural validation, fallback model on failure
- Review drafts in the question bank; edit any field; accept or discard
- Assemble tests by drag/reorder questions from the accepted bank
- Create student groups with auto-generated invite codes
- Assign tests to one or more groups with a deadline
- Analytics: average score, score distribution histogram, per-question accuracy, per-student rollup, class-wide weak topics
- Export tests to PDF (with or without answer key), DOCX (same), Google Forms–compatible JSON

### Student
- Register / login as STUDENT
- Join group by invite code
- See assigned quizzes with deadlines
- Take quiz: navigable question grid, per-type input controls, debounced auto-save, resume in-progress attempts
- Submit → automatic grading for all closed-form types
- Results page: total score, per-question review (your answer + correct answer + explanation), personalized recommendations based on weak topics + Bloom levels
- History of all attempts
- Progress page: timeline chart, strong topics, weak topics, Bloom breakdown

### System
- Role-based authorization (TEACHER vs STUDENT guards everywhere)
- Ownership checks (you can only see/edit your own sources, questions, tests, etc.)
- File uploads constrained to PDF/DOCX, 15 MB default
- Swagger UI at `http://localhost:4000/api/v1/docs`
- All endpoints under `/api/v1/*`

---

## Useful commands

From `backend/`:

| Command | What |
|---|---|
| `npm run dev` | Start API in watch mode |
| `npm run build && npm start` | Production build |
| `npx prisma migrate dev` | Apply migrations |
| `npx prisma studio` | Visual DB browser at :5555 |
| `npm run db:reset` | Wipe DB and re-migrate (will prompt) |
| `npm run db:seed` | Seed demo data |

From `frontend/`:

| Command | What |
|---|---|
| `npm run dev` | Vite dev server :5173 |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build |

---

## Architecture notes (for defense)

- **Why NestJS:** modular structure (one module per domain entity), built-in DI, decorators, guards, Swagger generation. Maps cleanly to the diploma's module breakdown.
- **Why Prisma:** type-safe DB access, migrations as first-class citizens, generates a TypeScript client from `schema.prisma`. Single source of truth for the data model.
- **Why JWT + rotating refresh tokens:** stateless API (no session store needed), short access tokens (15 min) limit blast radius, long-lived refresh tokens are hashed in DB and rotated on every refresh — so a leaked refresh token is invalidated as soon as the legitimate user refreshes once.
- **Why the question payload is JSON:** the four question types have structurally different correctness data (options + index vs. boolean vs. acceptable answers). Storing as `Json` keeps the schema lean and lets the type system drive validation at the application layer.
- **Why draft-then-accept:** the AI is a first-draft generator, not the final author. The teacher curates. Every generated question is `DRAFT` until manually accepted.
- **AI pipeline robustness:** large texts are segmented along paragraph boundaries (~3 000 chars each), each segment generates its share of the requested count, the model is asked for strict JSON via `response_format`, output is parsed with a fallback regex extractor, and each candidate question is shape-validated (e.g. MCQ must have exactly 4 options + a valid `correctIndex`) before being persisted.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `P1001: Can't reach database server` | Postgres isn't running, or `DATABASE_URL` is wrong. Try `pg_isready`. |
| `role "quizai" does not exist` | Re-run the `CREATE USER` SQL in step 2. |
| `Permission denied for schema public` | Inside `psql` connected to `quizai`: `GRANT ALL ON SCHEMA public TO quizai;` |
| `EADDRINUSE :::4000` | Something else is on 4000. Change `PORT` in `backend/.env`. |
| Frontend shows "Network Error" | API isn't running. Start it with `cd backend && npm run dev`. |
| `OpenAI not configured` on generate | Paste your API key into `backend/.env` and restart the backend. |
| 401 after a long idle | Refresh token is up; just log in again. |

---

## License

For diploma / academic use.
