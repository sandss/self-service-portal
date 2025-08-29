# Jobs Dashboard - Full Stack Demo

A runnable demo project showcasing a jobs dashboard powered by React (TypeScript) → FastAPI → ARQ workers (Redis) with Redis pub/sub bridged to the browser via WebSocket.

## Tech Stack

- **Backend**: FastAPI (Python 3.11), ARQ, Redis, Uvicorn
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Orchestration**: Docker Compose
- **Real-time**: WebSocket + Redis pub/sub

## Architecture

```
React Frontend (port 5173)
    ↓ HTTP API calls + WebSocket
FastAPI Server (port 8000)
    ↓ Job enqueue
ARQ Workers + Redis (port 6379)
    ↓ Pub/sub updates
WebSocket → Frontend (real-time updates)
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Run the Application

1. **Clone and navigate to the project:**
   ```bash
   git clone <repository-url>
   cd self-service-portal
   ```

2. **Start the entire stack:**
   ```bash
   docker compose up --build
   ```

3. **Open the application:**
   - Frontend: http://localhost:5173
   - API Documentation: http://localhost:8000/docs

### Usage

1. **Create demo jobs:**
   - Click "Seed Demo Jobs" to create 5 sample jobs
   - Or use the "Create New Job" form to enqueue individual jobs

2. **Watch real-time updates:**
   - Jobs progress from QUEUED → RUNNING → SUCCEEDED
   - Progress bars update live via WebSocket
   - State badges change color as jobs progress

3. **Interact with jobs:**
   - Filter by state (QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED)
   - Search by job ID or type
   - View job details (click "View")
   - Retry failed/cancelled jobs (click "Retry")

## API Examples

### Create a Job
```bash
curl -X POST http://localhost:8000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "sales_report",
    "parameters": {"region": "US", "month": "2024-01"},
    "user_id": "demo_user"
  }'
```

### List Jobs
```bash
# All jobs
curl http://localhost:8000/jobs

# Filter by state
curl "http://localhost:8000/jobs?state=RUNNING"

# Search and paginate
curl "http://localhost:8000/jobs?q=sales&page=1&page_size=10"
```

### Get Job Details
```bash
curl http://localhost:8000/jobs/{job_id}
```

### Retry a Job
```bash
curl -X POST http://localhost:8000/jobs/{job_id}/retry
```

### Seed Demo Jobs
```bash
curl -X POST http://localhost:8000/dev/seed
```

## Development

### Project Structure
```
self-service-portal/
├── docker-compose.yml          # Service orchestration
├── Dockerfile.api             # Python/FastAPI container
├── Dockerfile.web             # Node.js/React container
├── requirements.txt           # Python dependencies
├── api/                       # FastAPI application
│   ├── main.py               # API routes and WebSocket
│   ├── deps.py               # Dependency injection
│   ├── settings.py           # Configuration
│   └── test_api.py           # Basic tests
├── worker/                    # ARQ worker
│   ├── tasks.py              # Job implementations
│   └── worker_settings.py    # Worker configuration
└── web/                      # React frontend
    ├── src/
    │   ├── components/       # React components
    │   ├── api.ts           # API client
    │   └── types.ts         # TypeScript types
    └── package.json
```

### Run Tests
```bash
# API tests
docker compose exec api pytest api/test_api.py -v

# Or run locally with Python environment
cd self-service-portal
pip install -r requirements.txt
pytest api/test_api.py -v
```

### Environment Variables

- `REDIS_URL`: Redis connection string (default: `redis://localhost:6379/0`)
- `VITE_API_URL`: Frontend API base URL (default: `http://localhost:8000`)

## Features

### Backend (FastAPI + ARQ)
- ✅ Job creation and enqueueing
- ✅ Job state management (QUEUED → RUNNING → SUCCEEDED/FAILED)
- ✅ Progress tracking with real-time updates
- ✅ Job listing with filtering and pagination
- ✅ Job retry functionality
- ✅ WebSocket for real-time updates
- ✅ Redis pub/sub for worker communication
- ✅ Automatic job expiration (3 days TTL)

### Frontend (React + TypeScript)
- ✅ Real-time job dashboard
- ✅ Live progress updates via WebSocket
- ✅ Job filtering (by state) and search
- ✅ Pagination
- ✅ Job creation form
- ✅ Job retry functionality
- ✅ Responsive design with Tailwind CSS

### Infrastructure
- ✅ Docker Compose orchestration
- ✅ Multi-service setup (API, Worker, Redis, Web)
- ✅ Health checks
- ✅ Development-friendly mounting

## Future Enhancements (TODOs)

### Security
- [ ] JWT authentication
- [ ] User-scoped job access (filter by `user_id`)
- [ ] API rate limiting

### Features
- [ ] Job cancellation support
- [ ] Job scheduling (cron-like)
- [ ] File upload/download for job inputs/outputs
- [ ] Job dependencies and workflows

### Observability
- [ ] Prometheus metrics
- [ ] OpenTelemetry tracing
- [ ] Structured logging
- [ ] Health check endpoints

### Scalability
- [ ] Horizontal worker scaling
- [ ] Job prioritization
- [ ] Dead letter queues
- [ ] Result storage optimization

## Alternative Queue Systems

The system is designed to be queue-agnostic. To swap ARQ for **Dramatiq** with Redis:

1. Replace ARQ dependencies with Dramatiq
2. Update `worker/worker_settings.py` to use `RedisBroker`
3. Keep the same API contract (`/jobs` + `/ws/jobs`)
4. Frontend requires no changes

The job state management and WebSocket communication patterns remain identical.

## Troubleshooting

### Services won't start
```bash
# Check service logs
docker compose logs api
docker compose logs worker
docker compose logs redis

# Restart services
docker compose restart
```

### WebSocket connection issues
- Ensure API service is running on port 8000
- Check browser console for WebSocket errors
- Verify `VITE_API_URL` environment variable

### Jobs stuck in QUEUED state
- Check worker service logs: `docker compose logs worker`
- Verify Redis connectivity: `docker compose exec redis redis-cli ping`
- Restart worker: `docker compose restart worker`

### Port conflicts
- Change ports in `docker-compose.yml` if 8000, 5173, or 6379 are in use
- Update `VITE_API_URL` if API port changes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and add tests
4. Submit a pull request

## License

MIT License - see LICENSE file for details.
