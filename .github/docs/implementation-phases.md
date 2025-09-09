# Self-Service Portal Implementation Phases

## Architectural Overview

The self-service portal is built as a microservices architecture with the following components:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend API**: FastAPI + Python 3.11
- **Task Queue**: ARQ workers with Redis
- **Real-time Updates**: WebSocket + Redis pub/sub
- **Catalog System**: Dynamic catalog with Git/local/bundle import
- **Orchestration**: Docker Compose

## Phase 1: Foundation Infrastructure

### Objective
Establish core infrastructure with job queue system, real-time dashboard, and basic API endpoints.

| Card ID | Title | Description | Acceptance Criteria |
|---------|-------|-------------|-------------------|
| **INFRA-001** | Docker Compose Setup | Create multi-service Docker environment with Redis, API, Worker, and Web services | • `docker-compose.yml` with 4 services<br>• Redis on port 6379<br>• API on port 8000<br>• Web on port 5173<br>• All services start successfully |
| **INFRA-002** | API Dockerfile | Create optimized Python container for FastAPI application | • `Dockerfile.api` with Python 3.11-slim base<br>• Requirements installation<br>• Hot reload support for development<br>• Container builds without errors |
| **INFRA-003** | Web Dockerfile | Create Node.js container for React frontend | • `Dockerfile.web` with Node 20-alpine<br>• Vite dev server configuration<br>• Hot reload enabled<br>• Serves on all interfaces (0.0.0.0) |
| **INFRA-004** | Python Dependencies | Define core Python package requirements | • `requirements.txt` with FastAPI, ARQ, Redis, Pydantic<br>• Version compatibility verified<br>• All packages install successfully |

## Phase 2: Core Job System

### Objective
Implement job queue system with ARQ workers, Redis pub/sub, and basic job lifecycle management.

| Card ID | Title | Description | Acceptance Criteria |
|---------|-------|-------------|-------------------|
| **CORE-001** | Settings Configuration | Create centralized configuration management | • `api/settings.py` with Pydantic BaseSettings<br>• Redis URL, TTL, job prefixes configured<br>• Environment variable support |
| **CORE-002** | Redis Connection Pool | Implement Redis connection management for API | • `api/deps.py` with ARQ pool factory<br>• Connection reuse and cleanup<br>• Health check endpoint |
| **CORE-003** | Worker Task Framework | Create ARQ worker foundation with job lifecycle | • `worker/tasks.py` with job state management<br>• Redis hash storage for job metadata<br>• Pub/sub notifications on state changes<br>• Progress tracking support |
| **CORE-004** | Example Long Task | Implement demo task with progress reporting | • `example_long_task` with 5-step progress<br>• State transitions: QUEUED → RUNNING → SUCCEEDED<br>• Error handling with FAILED state<br>• 1-second delays between steps |
| **CORE-005** | Worker Configuration | Configure ARQ worker settings and registration | • `worker/worker_settings.py` with function registry<br>• Redis settings from environment<br>• Worker starts and processes jobs |

## Phase 3: REST API Endpoints

### Objective
Build comprehensive REST API for job management with CRUD operations and filtering.

| Card ID | Title | Description | Acceptance Criteria |
|---------|-------|-------------|-------------------|
| **API-001** | Job Creation Endpoint | POST endpoint to enqueue new jobs | • `POST /jobs` accepts job payload<br>• Returns job_id immediately<br>• Validates required fields (report_type, parameters)<br>• Enqueues task in ARQ |
| **API-002** | Job Listing Endpoint | GET endpoint with filtering and pagination | • `GET /jobs` with query parameters<br>• State filtering (QUEUED, RUNNING, etc.)<br>• Text search in job ID/type<br>• Pagination (page, page_size)<br>• Returns job metadata with total count |
| **API-003** | Job Detail Endpoint | GET endpoint for individual job details | • `GET /jobs/{job_id}` returns full job data<br>• Includes all metadata fields<br>• JSON decoding of complex fields<br>• 404 for non-existent jobs |
| **API-004** | Job Retry Endpoint | POST endpoint to retry failed jobs | • `POST /jobs/{job_id}/retry` for FAILED/CANCELLED<br>• Creates new job with same parameters<br>• Returns new job_id<br>• Validates job state before retry |
| **API-005** | WebSocket Real-time Updates | WebSocket endpoint for live job updates | • `WebSocket /ws/jobs` connection<br>• Subscribes to Redis pub/sub channel<br>• Forwards job state changes to clients<br>• Handles connection lifecycle |

## Phase 4: Frontend Dashboard

### Objective
Create responsive React dashboard with real-time updates, filtering, and job management UI.

| Card ID | Title | Description | Acceptance Criteria |
|---------|-------|-------------|-------------------|
| **UI-001** | Vite React Setup | Initialize React project with TypeScript and Tailwind | • Vite project with React + TypeScript<br>• Tailwind CSS configured<br>• Development server on port 5173<br>• Hot reload functional |
| **UI-002** | Jobs Dashboard Component | Main dashboard with job table and filters | • `JobsDashboard.tsx` with data table<br>• Columns: ID, Type, State, Progress, Updated, Actions<br>• State filter dropdown<br>• Search input with debouncing<br>• Pagination controls |
| **UI-003** | Real-time WebSocket | WebSocket integration for live updates | • WebSocket connection to `/ws/jobs`<br>• Automatic reconnection on disconnect<br>• Updates job rows without full refresh<br>• Connection status indicator |
| **UI-004** | Job Progress Visualization | Progress bars and state badges | • Animated progress bars for RUNNING jobs<br>• Color-coded state badges<br>• Success/error indicators<br>• Responsive design |
| **UI-005** | Job Actions | Interactive buttons for job operations | • View button linking to job details<br>• Retry button for failed jobs<br>• Action button state management<br>• Loading states during operations |
| **UI-006** | Job Enqueue Form | Form to create demo jobs | • Form with report_type dropdown<br>• JSON textarea for parameters<br>• Form validation<br>• Success/error feedback |

## Phase 5: Dynamic Catalog System

### Objective
Implement dynamic catalog with multiple import sources, schema-driven forms, and catalog management.

| Card ID | Title | Description | Acceptance Criteria |
|---------|-------|-------------|-------------------|
| **CAT-001** | Catalog Configuration | Settings and storage configuration for catalog system | • `api/catalog/settings.py` with blob directory<br>• Local catalog root configuration<br>• Git execution options<br>• Environment variable support |
| **CAT-002** | Catalog Registry | JSON-based metadata storage with thread safety | • `api/catalog/registry.py` with file-based storage<br>• Thread-safe read/write operations<br>• CRUD operations for catalog items<br>• Version management |
| **CAT-003** | Bundle Management | Tar.gz packing/unpacking utilities | • `api/catalog/bundles.py` with pack/unpack functions<br>• Directory to bundle conversion<br>• Bundle extraction to temp directories<br>• Descriptor loading from directories |
| **CAT-004** | Validation Framework | Schema and manifest validation | • `api/catalog/validate.py` with JSON Schema validation<br>• Manifest required field validation<br>• Input validation against schemas<br>• Clear error messages |
| **CAT-005** | Git Sync Worker | Background job for Git repository synchronization | • `worker/catalog_sync.py` with Git operations<br>• Tag-based item extraction (item@version)<br>• Repository cloning and checkout<br>• Bundle creation from Git sources |
| **CAT-006** | Catalog Execution Worker | Dynamic task execution from catalog bundles | • `worker/catalog_execute.py` with dynamic imports<br>• Bundle unpacking and module loading<br>• Input validation before execution<br>• Progress reporting integration |

## Phase 6: Catalog API Endpoints

### Objective
Build REST API for catalog management with multiple import methods and CRUD operations.

| Card ID | Title | Description | Acceptance Criteria |
|---------|-------|-------------|-------------------|
| **CAT-API-001** | Catalog Listing Endpoints | API endpoints for browsing catalog items | • `GET /catalog` returns all items with versions<br>• `GET /catalog/{item_id}/versions` lists versions<br>• Proper JSON structure with metadata<br>• Performance optimization for large catalogs |
| **CAT-API-002** | Catalog Descriptor Endpoints | API endpoints for retrieving item schemas and UI | • `GET /catalog/{item_id}/{version}/descriptor`<br>• `GET /catalog/{item_id}/latest/descriptor`<br>• Returns manifest, schema, and UI schema<br>• 404 handling for missing items |
| **CAT-API-003** | Local Import Endpoint | API endpoint for importing local catalog items | • `POST /catalog/local/import` with path parameter<br>• Directory validation and processing<br>• Bundle creation and registry update<br>• Error handling for invalid items |
| **CAT-API-004** | Git Webhook Endpoint | API endpoint for Git repository webhooks | • `POST /catalog/git/webhook` for automated imports<br>• Payload validation and job enqueueing<br>• Multiple tag processing<br>• Security considerations (signature validation) |
| **CAT-API-005** | Bundle Upload Endpoint | API endpoint for direct bundle uploads | • `POST /catalog/bundle/upload` with file upload<br>• Multipart form data handling<br>• Bundle validation and extraction<br>• Progress reporting for large uploads |

## Phase 7: Catalog Frontend

### Objective
Create user-friendly catalog interface with dynamic form rendering and import capabilities.

| Card ID | Title | Description | Acceptance Criteria |
|---------|-------|-------------|-------------------|
| **CAT-UI-001** | Catalog Browser Page | Main catalog browsing interface | • `pages/Catalog.tsx` with item grid/list<br>• Item selection and version dropdown<br>• Visual item cards with metadata<br>• Search and filtering capabilities |
| **CAT-UI-002** | Dynamic Form Rendering | RJSF integration for schema-driven forms | • React JSON Schema Form integration<br>• Dynamic form generation from catalog schemas<br>• UI schema support for customization<br>• Form validation and error display |
| **CAT-UI-003** | Import Modal Component | Multi-modal import interface | • `ImportCatalog.tsx` with tabbed interface<br>• Local folder import tab<br>• Git repository import tab<br>• Bundle upload tab<br>• Progress indication during imports |
| **CAT-UI-004** | Catalog Execution Flow | Integration between catalog and job system | • Form submission creates catalog jobs<br>• Job parameter validation<br>• Redirect to job dashboard after submission<br>• Success/error feedback |
| **CAT-UI-005** | Catalog Styling | Orange theme integration and responsive design | • Consistent orange color scheme<br>• RJSF custom styling<br>• Responsive layout for mobile/desktop<br>• Loading states and animations |

## Phase 8: Production Readiness

### Objective
Add production-ready features including monitoring, security, and deployment optimizations.

| Card ID | Title | Description | Acceptance Criteria |
|---------|-------|-------------|-------------------|
| **PROD-001** | Environment Configuration | Production vs development environment handling | • Environment-specific settings<br>• Docker production builds<br>• SSL/TLS configuration<br>• Health check endpoints |
| **PROD-002** | Error Handling & Logging | Comprehensive error handling and logging | • Structured logging with correlation IDs<br>• Error boundaries in React<br>• API error response standardization<br>• Log aggregation compatibility |
| **PROD-003** | Security Headers & CORS | Security configurations for production | • CORS policy configuration<br>• Security headers (CSP, HSTS, etc.)<br>• Input sanitization<br>• Rate limiting implementation |
| **PROD-004** | Performance Optimization | Frontend and backend performance improvements | • React bundle optimization<br>• API response caching<br>• Database query optimization<br>• Static asset compression |
| **PROD-005** | Testing Suite | Comprehensive test coverage | • API unit tests with pytest<br>• Frontend component tests<br>• Integration tests<br>• End-to-end test scenarios |

## Phase 9: Monitoring & Observability

### Objective
Implement comprehensive monitoring, metrics, and observability for production operations.

| Card ID | Title | Description | Acceptance Criteria |
|---------|-------|-------------|-------------------|
| **MON-001** | Application Metrics | Prometheus metrics collection | • Job execution metrics<br>• API response time metrics<br>• Worker queue depth monitoring<br>• Custom business metrics |
| **MON-002** | Health Checks | Comprehensive health check endpoints | • API health endpoint<br>• Worker health monitoring<br>• Redis connection health<br>• Dependency health checks |
| **MON-003** | Alerting System | Alert configuration for critical issues | • Failed job rate alerts<br>• Queue depth alerts<br>• System resource alerts<br>• Integration with alert managers |
| **MON-004** | Dashboard Creation | Operational dashboards for monitoring | • Job execution dashboard<br>• System performance dashboard<br>• Error rate monitoring<br>• User activity tracking |

## Phase 10: Documentation & Deployment

### Objective
Complete documentation, deployment guides, and developer onboarding materials.

| Card ID | Title | Description | Acceptance Criteria |
|---------|-------|-------------|-------------------|
| **DOC-001** | API Documentation | OpenAPI/Swagger documentation | • Complete API documentation<br>• Interactive Swagger UI<br>• Example requests/responses<br>• Authentication documentation |
| **DOC-002** | Developer Guide | Comprehensive developer documentation | • Setup and installation guide<br>• Architecture documentation<br>• Contribution guidelines<br>• Troubleshooting guide |
| **DOC-003** | Deployment Guide | Production deployment documentation | • Docker Compose production setup<br>• Kubernetes deployment manifests<br>• Environment variable reference<br>• Scaling considerations |
| **DOC-004** | User Manual | End-user documentation | • Catalog creation guide<br>• Job management tutorial<br>• Import process documentation<br>• FAQ and troubleshooting |

## Success Metrics

### Technical Metrics
- **Performance**: API response time < 200ms for 95th percentile
- **Reliability**: 99.9% uptime for core services
- **Scalability**: Support for 1000+ concurrent jobs
- **Maintainability**: < 2 hour mean time to resolution for issues

### Business Metrics
- **User Adoption**: Successfully onboard initial user cohort
- **Catalog Growth**: Support 50+ catalog items across multiple teams
- **Job Execution**: Process 10,000+ jobs per day
- **Error Rate**: < 1% job failure rate for valid inputs

## Risk Mitigation

### Technical Risks
- **Redis Memory**: Implement TTL and cleanup strategies
- **Worker Scaling**: Design for horizontal worker scaling
- **Bundle Security**: Sandbox execution environment
- **Git Integration**: Handle authentication and large repositories

### Operational Risks
- **Data Loss**: Implement backup and recovery procedures
- **Security**: Regular security audits and updates
- **Performance**: Load testing and capacity planning
- **Dependencies**: Vendor risk assessment and alternatives

This implementation plan provides a structured approach to building the self-service portal with clear deliverables, acceptance criteria, and success metrics for each phase.
