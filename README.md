# Self-Service Portal - Full Stack Demo

A comprehensive self-service portal with catalog-driven job execution, real-time job monitoring, and detailed job tracking. Features React (TypeScript) → FastAPI → ARQ workers (Redis) with dynamic catalog item execution and real-time updates.

## Tech Stack

- **Backend**: FastAPI (Python 3.11), ARQ, Redis, Uvicorn
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Catalog System**: Dynamic Python task execution with schema validation
- **Orchestration**: Docker Compose
- **Real-time**: WebSocket + Redis pub/sub

## Architecture

```
React Frontend (port 5173)
    ↓ HTTP API calls + WebSocket
FastAPI Server (port 8000)
    ↓ Job enqueue & Catalog management
ARQ Workers + Redis (port 6379)
    ↓ Dynamic task execution & Pub/sub updates
Catalog Items (catalog_local/)
    ↓ Python task.py files loaded dynamically
WebSocket → Frontend (real-time updates)
```

## Key Features

### 🎯 **Self-Service Catalog**
- Browse and execute catalog items (infrastructure tasks, health checks, etc.)
- Dynamic schema-driven forms with UI generation
- Version management for catalog items
- Hot-reloading of task.py files (no restart required)

### 📊 **Job Dashboard** 
- Real-time job monitoring with auto-refresh
- Detailed job pages with progress tracking
- Job filtering, search, and pagination
- Navigate between jobs list and individual job details

### ⚡ **Dynamic Execution**
- Catalog items execute Python tasks dynamically
- Progress callbacks for real-time updates
- Robust error handling and retry logic
- Input validation with JSON schemas

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

#### **Catalog Execution**
1. **Browse catalog items:**
   - Click "Catalog" in the navigation
   - View available items: backup-config, system-health-check, user-registration
   - Each item shows available versions and descriptions

2. **Execute catalog items:**
   - Select an item and fill out the generated form
   - Forms are automatically generated from JSON schemas
   - Click "Execute" to start the job
   - You'll be redirected to the job detail page to monitor progress

#### **Job Monitoring**  
1. **Jobs Dashboard:**
   - Click "Jobs" to view all jobs
   - Real-time updates show job progress and state changes
   - Click on any job ID to view detailed information

2. **Job Detail Pages:**
   - View comprehensive job information (timeline, progress, results)
   - Auto-refreshing for running jobs
   - "Back to Jobs" button for easy navigation
   - JSON display of input parameters and results

3. **Legacy job creation:**
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

### Execute Catalog Items
```bash
# Execute backup-config task
curl -X POST http://localhost:8000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "catalog",
    "parameters": {
      "item_id": "backup-config",
      "version": "2.0.0",
      "inputs": {
        "devices": ["router-1", "switch-2"],
        "bucket": "my-backup-bucket",
        "encryption": true,
        "schedule": "daily"
      }
    }
  }'

# Execute system health check
curl -X POST http://localhost:8000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "catalog", 
    "parameters": {
      "item_id": "system-health-check",
      "version": "1.0.0",
      "inputs": {
        "services": ["api", "database", "cache"],
        "performance_tests": true,
        "alert_threshold": 20
      }
    }
  }'
```

### Browse Catalog
```bash
# List all catalog items
curl http://localhost:8000/catalog

# Get item descriptor with schema
curl http://localhost:8000/catalog/backup-config/latest/descriptor
```

### Legacy Job Creation
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
│   ├── test_api.py           # Basic tests
│   └── catalog/              # Catalog management
│       ├── routes.py         # Catalog API endpoints
│       ├── registry.py       # Item storage/retrieval
│       ├── bundles.py        # Package management
│       └── validate.py       # Schema validation
├── worker/                    # ARQ worker
│   ├── tasks.py              # Job implementations
│   ├── catalog_execute.py    # Dynamic catalog execution
│   ├── catalog_sync.py       # Catalog synchronization
│   └── worker_settings.py    # Worker configuration
├── catalog_local/             # Local catalog items
│   └── items/                # Individual catalog items
│       ├── backup-config/    # Example: Network backup task
│       │   ├── 1.0.0/       # Version 1.0.0
│       │   │   ├── manifest.yaml
│       │   │   ├── schema.json
│       │   │   ├── ui.json
│       │   │   └── task.py   # ← Dynamic execution (hot-reload)
│       │   └── 2.0.0/       # Version 2.0.0
│       ├── system-health-check/
│       └── user-registration/
└── web/                      # React frontend
    ├── src/
    │   ├── components/       # React components
    │   │   ├── JobsDashboard.tsx  # Jobs list view
    │   │   ├── JobTable.tsx       # Jobs table component
    │   │   ├── EnqueueForm.tsx    # Legacy job creation
    │   │   └── SelfService.tsx    # Catalog browser
    │   ├── pages/            # Page components
    │   │   ├── Catalog.tsx   # Catalog page
    │   │   └── JobDetail.tsx # Individual job details
    │   ├── api.ts           # API client
    │   └── types.ts         # TypeScript types
    └── package.json
```

### Catalog Development

#### **Hot-Reload Development**
```bash
# Edit any task.py file in catalog_local/items/
# Changes take effect immediately on next job execution
# No container restart required!

# Example: Update backup-config task
vim catalog_local/items/backup-config/2.0.0/task.py
```

#### **Creating New Catalog Items**
1. Create item directory: `catalog_local/items/my-task/1.0.0/`
2. Add required files:
   - `manifest.yaml` - Item metadata
   - `schema.json` - Input validation schema  
   - `ui.json` - Form generation config
   - `task.py` - Python execution logic

#### **Task.py Dynamic Loading**
- Each execution imports `task.py` fresh from filesystem
- Supports progress callbacks: `await progress_callback(50, "Processing...")`
- Input validation via JSON Schema
- Return structured results for display

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
- `JOB_TTL`: Job data retention in Redis (default: 3 days)
- `JOB_STATUS_PREFIX`: Redis key prefix for job status (default: `job_status:`)

## Features

### Backend (FastAPI + ARQ + Catalog)
- ✅ **Catalog System**: Dynamic Python task execution with hot-reload
- ✅ **Schema Validation**: JSON Schema-based input validation  
- ✅ **Version Management**: Multiple versions per catalog item
- ✅ **Job Management**: Creation, listing, filtering, retry functionality
- ✅ **Real-time Updates**: WebSocket + Redis pub/sub
- ✅ **Progress Tracking**: Live progress updates with custom messages
- ✅ **Error Handling**: Robust error handling with detailed job information
- ✅ **Job Detail API**: Individual job endpoints with comprehensive data

### Frontend (React + TypeScript)
- ✅ **Self-Service Catalog**: Browse and execute infrastructure tasks
- ✅ **Dynamic Forms**: Auto-generated forms from JSON schemas
- ✅ **Job Dashboard**: Real-time job monitoring with filtering/search
- ✅ **Job Detail Pages**: Comprehensive job information with navigation
- ✅ **Responsive Design**: Modern UI with Tailwind CSS
- ✅ **Auto-refresh**: Live updates for running jobs
- ✅ **Navigation**: Seamless flow between catalog, jobs, and job details

### Infrastructure & DevX
- ✅ **Docker Compose**: Multi-service orchestration
- ✅ **Hot-reload**: Task.py changes take effect immediately
- ✅ **Health Checks**: Container health monitoring
- ✅ **Development Mounting**: Live code reloading during development
- ✅ **Defensive Coding**: Robust error handling for missing data

## Recent Improvements

### 🚀 **Job Detail Pages**
- **Individual job pages** with comprehensive information display
- **Real-time auto-refresh** for running jobs  
- **Navigation flow**: Jobs list → Job detail → Back to jobs
- **Timeline view**: Created, started, finished timestamps
- **Results display**: Formatted JSON output with syntax highlighting
- **Error handling**: Detailed error information and retry options

### 🔧 **Backend Robustness** 
- **Defensive coding**: Handle missing Redis fields gracefully
- **Race condition handling**: Job creation with retry logic for immediate access
- **Error prevention**: No more 500 errors from missing job data
- **API consistency**: All job endpoints return consistent data structure

### 💫 **User Experience**
- **Seamless navigation**: Fixed routing issues between pages
- **Loading states**: Proper loading indicators and error handling
- **Auto-refresh**: Jobs update in real-time without manual refresh
- **Responsive design**: Works well on desktop and mobile

## Future Enhancements (TODOs)

### Catalog System
- [ ] **Catalog Registry**: Remote catalog item storage and distribution
- [ ] **Item Templates**: Scaffolding for new catalog items
- [ ] **Dependency Management**: Catalog item dependencies and requirements
- [ ] **Testing Framework**: Unit testing for catalog items

### Advanced Features
- [ ] **Job Scheduling**: Cron-like scheduling for catalog items
- [ ] **Workflow Engine**: Multi-step jobs with dependencies  
- [ ] **File Handling**: Upload/download support for job inputs/outputs
- [ ] **Approval Workflows**: Multi-stage approval for sensitive operations

### Security
- [ ] JWT authentication
- [ ] User-scoped job access (filter by `user_id`)
- [ ] API rate limiting

### Features
- [ ] Job cancellation support
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

### Job Detail Pages Not Loading
```bash
# Check if job exists
curl http://localhost:8000/jobs/{job_id}

# Check browser console for errors (F12 → Console)
# Look for navigation or API errors

# Restart web container to clear cache
docker compose restart web
```

### WebSocket connection issues  
- Ensure API service is running on port 8000
- Check browser console for WebSocket errors
- Verify `VITE_API_URL` environment variable

### Catalog Items Not Executing
```bash
# Check worker logs for Python errors
docker compose logs worker

# Verify catalog item structure
ls -la catalog_local/items/your-item/1.0.0/
# Should contain: manifest.yaml, schema.json, ui.json, task.py

# Test catalog item loading
curl http://localhost:8000/catalog/your-item/latest/descriptor
```

### Task.py Changes Not Taking Effect
- ✅ **Good news**: Changes should take effect immediately (hot-reload)
- ❌ **If not working**: Check Python syntax errors in worker logs
- 🔄 **Force refresh**: Restart worker container if needed

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
