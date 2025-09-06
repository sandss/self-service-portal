---
mode: agent
---
You are an expert full-stack assistant. Create a runnable demo project that shows a jobs dashboard powered by React (TypeScript) → FastAPI → ARQ workers (Redis) with Redis pub/sub bridged to the browser via WebSocket. Follow these requirements exactly:

Tech & Structure

Backend: FastAPI (Python 3.11), ARQ, Redis, Uvicorn.

Frontend: React + Vite + TypeScript + Tailwind (keep styling minimal).

Orchestration: docker-compose with services: api, worker, redis, web.

Port map: API on :8000, Web on :5173, Redis on :6379.

Create this repo structure and file contents:

self-service-portal/
├─ docker-compose.yml
├─ Dockerfile.api
├─ Dockerfile.web
├─ requirements.txt
├─ api/
│  ├─ main.py
│  ├─ deps.py
│  ├─ settings.py
│  └─ __init__.py
├─ worker/
│  ├─ tasks.py
│  ├─ worker_settings.py
│  └─ __init__.py
└─ web/  (Vite React TS app)

1) requirements.txt

Include:

fastapi
uvicorn[standard]
pydantic
arq
redis
python-dotenv

2) docker-compose.yml

Service redis: redis:7, expose 6379.

Service api: build from Dockerfile.api, mounts repo, env REDIS_URL=redis://redis:6379/0, command uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload. Depends on redis.

Service worker: build from Dockerfile.api, mounts repo, env REDIS_URL=redis://redis:6379/0, command arq worker.worker_settings.WorkerSettings. Depends on redis.

Service web: build from Dockerfile.web, runs npm run dev -- --host 0.0.0.0, expose 5173, depends on api.

3) Dockerfile.api

Base: python:3.11-slim

Install build-essential and pip install -r requirements.txt

Workdir /app

Default command overridden by compose.

4) Dockerfile.web

Base: node:20-alpine

Workdir /app

Copy web/package*.json and install

Copy the rest of /web

Default command overridden by compose.

5) api/settings.py

Python pydantic settings with:

REDIS_URL: str = "redis://localhost:6379/0"

JOB_TTL: int = 60*60*24*3

JOB_STATUS_PREFIX: str = "job:"

6) api/deps.py

get_arq_pool() using arq.create_pool(RedisSettings.from_dsn(REDIS_URL)).

7) worker/tasks.py

Implement:

Helper _publish(arq_redis, payload) → publish to channel:jobs

Helper _touch(arq_redis, job_meta):

HSET job:{id} with fields (id, type, state, progress, created_at, updated_at, started_at, finished_at, params, result, error), JSON-encode complex fields.

ZADD indexes: jobs:index and jobs:index:state:{STATE}; remove from other state indexes.

EXPIRE hash by JOB_TTL.

Publish { "type": "upsert", "job": <job_meta> }

example_long_task(ctx, job_id: str, payload: dict):

Initialize job with state QUEUED, then RUNNING, then increment progress in 5 steps (sleep 1s), finally SUCCEEDED with a small JSON result.

On exception set FAILED with error.

8) worker/worker_settings.py

Register functions = [example_long_task]

redis_settings from REDIS_URL

Optionally keep_result = 0, comment # max_jobs = 10

9) api/main.py

FastAPI with:

POST /jobs → enqueue example_long_task with payload {report_type, parameters, user_id} and return {"job_id": <id>}.

GET /jobs → list with optional state filter (QUEUED|RUNNING|SUCCEEDED|FAILED|CANCELLED), q search (in id or type), pagination (page, page_size), return {items, page, page_size, total}. Reads hashes job:{id} and decodes JSON fields (params, result, error).

GET /jobs/{job_id} → return the hash fields for that job.

POST /jobs/{job_id}/retry → only if FAILED or CANCELLED, re-enqueue with same params, return new job_id.

WebSocket /ws/jobs → subscribe to channel:jobs on Redis and forward messages to clients (upsert events). Use arq.subscribe.

Add CORS allow_origins=["*"] for demo.

10) Frontend: web/

Create a Vite React TS app with Tailwind. Provide minimal UI:

A page JobsDashboard.tsx that:

Fetches /jobs?page=1&page_size=20&state=<opt>&q=<opt>

Connects to ws://localhost:8000/ws/jobs (or computed from origin) to receive JSON events and update rows live.

Columns: ID (mono, truncated), Type, State (badge), Progress (bar), Updated (local time), Actions (View, Retry if failed/cancelled).

Filters: state dropdown, search box, pagination (prev/next).

A simple Enqueue form to create a demo job (report_type select, parameters JSON textarea) posting to /jobs.

Put routing at / → JobsDashboard with an inline enqueue panel.

Key detail: the frontend should read API base URL from VITE_API_URL (default http://localhost:8000); WS URL derived from it (ws(s)://.../ws/jobs).

11) Seed script (optional but helpful)

Add an API route POST /dev/seed that enqueues 5 demo jobs of mixed types to showcase the dashboard quickly.

12) Run & Verify

Add a top-level README.md with:

docker compose up --build

Open http://localhost:5173

Click “Enqueue Demo Job” → watch it appear and progress live

curl http://localhost:8000/jobs should list jobs

13) Basic tests

Add api/test_api.py (pytest) with one test:

Enqueue a job via POST /jobs, then GET /jobs/{id} returns QUEUED/RUNNING/… (no flakiness; just assert structure).

14) Nice-to-haves (commented in code)

Mention where to add JWT auth and row-level scoping (user_id).

Add a job:{id}:cancel flag pattern (task checks between steps).

Metrics TODOs for Prometheus/OTel.

After creating files

Print the exact commands the user should run to start the stack and open the app.

Show example curl to enqueue a job and to list jobs.

Keep the code clean, minimal, and runnable as-is.

Stretch goal (comment only, no code now): note how to swap ARQ for Dramatiq (RedisBroker) without changing the frontend—same /jobs + /ws/jobs contract.

Build all files now.