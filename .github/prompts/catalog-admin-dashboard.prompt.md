---
mode: agent
---

# Catalog Administration Dashboard

You are an expert full-stack architect. Design and implement a comprehensive administration dashboard for the existing Dynamic Catalog system in the self-service portal. This should provide administrators with full lifecycle management capabilities for catalog items.

## Current Implementation Analysis

### Architecture Overview
The existing system uses:
- **Backend**: FastAPI + ARQ workers + Redis for job queue/pub-sub
- **Frontend**: React + TypeScript with RJSF for dynamic forms
- **Storage**: Local filesystem with JSON-based registry + tar.gz bundles
- **Execution**: Isolated Python task execution via ARQ workers

### Current Catalog Data Flow

#### 1. Import Sources
**Local Import** (`/catalog/local/import`):
- Reads from mounted filesystem (`/app/catalog_local/items/{item_id}/`)
- Validates `manifest.yaml`, `schema.json`, optional `ui.json`
- Packs directory into tar.gz bundle
- Stores in `/app/data/catalog_bundles/{item_id}@{version}.tar.gz`
- Registers metadata in `/app/data/catalog_registry.json`

**Git Import** (`/catalog/git/webhook`):
- Worker job `sync_catalog_item` clones repo at specific tag
- Expects tag format: `{item_id}@{semver}` (e.g., `backup-config@1.2.0`)
- Extracts from `items/{item_id}/` subdirectory in repo
- Same validation/packing/storage flow as local import

**Bundle Upload** (via ImportCatalog component):
- Frontend uploads `.tar.gz` files
- Backend extracts, validates, and re-packs if needed

#### 2. Storage Architecture
```
/app/data/
├── catalog_registry.json          # Metadata registry
└── catalog_bundles/               # Bundle storage
    ├── backup-config@1.0.0.tar.gz
    ├── backup-config@2.0.0.tar.gz
    └── user-registration@1.0.0.tar.gz
```

**Registry Structure**:
```json
{
  "items": {
    "backup-config": {
      "versions": {
        "1.0.0": {
          "manifest": {...},
          "schema": {...},
          "ui": {...},
          "storage_uri": "/app/data/catalog_bundles/backup-config@1.0.0.tar.gz",
          "source": {"repo": "...", "ref": "backup-config@1.0.0", "path": "items/backup-config"},
          "active": true
        }
      }
    }
  }
}
```

#### 3. Validation Pipeline
- **Manifest validation**: Required fields `[id, name, version, entrypoint]`
- **Schema validation**: JSON Schema Draft 7 compliance via `jsonschema` library
- **Input validation**: Runtime validation of user inputs against schema before execution

#### 4. Execution Flow
1. User selects catalog item + version in `/catalog` page
2. RJSF renders dynamic form from `schema.json` + `ui.json`
3. Form submission creates job via `/jobs` endpoint with `report_type: "catalog"`
4. ARQ worker `run_catalog_item` executes:
   - Retrieves bundle from storage
   - Unpacks to temp directory
   - Dynamically imports `task.py` module
   - Validates inputs against schema
   - Executes `task.run(inputs)` function
   - Reports progress/results via Redis pub-sub

### Current Components

#### Backend (`api/catalog/`):
- `settings.py`: Configuration (blob dir, local root, git options)
- `registry.py`: JSON-based metadata store with thread-safe operations
- `bundles.py`: Tar.gz packing/unpacking utilities
- `validate.py`: Manifest/schema/input validation
- `routes.py`: REST endpoints for catalog CRUD operations

#### Workers (`worker/`):
- `catalog_sync.py`: Git repository synchronization
- `catalog_execute.py`: Bundle execution with dynamic module loading
- Registered in `worker_settings.py` as ARQ functions

#### Frontend (`web/src/`):
- `pages/Catalog.tsx`: User-facing catalog browser with dynamic forms
- `components/ImportCatalog.tsx`: Multi-modal import interface (local/git/bundle)
- RJSF integration for schema-driven form rendering

#### Infrastructure:
- Docker Compose with mounted volumes for data persistence
- Redis for job queue and real-time updates
- FastAPI with async/await support

### Current Limitations & Gaps

#### 1. No Administrative Interface
- No visibility into catalog lifecycle
- No bulk operations (archive/delete multiple items)
- No audit trail of changes
- No rollback capabilities

#### 2. Limited Metadata Management
- No versioning strategy beyond semver strings
- No deprecation/lifecycle states
- No usage analytics or execution history
- No dependency tracking between catalog items

#### 3. Storage Concerns
- No cleanup of old/unused bundles
- No compression or deduplication
- No backup/restore capabilities
- No storage quotas or limits

#### 4. Security & Governance
- No role-based access control for admin functions
- No approval workflow for catalog changes
- No sandboxing or resource limits for task execution
- No secret management for catalog items

## Requirements for Admin Dashboard

Design and implement a comprehensive administrative interface that addresses these gaps while maintaining the existing user-facing catalog functionality. The solution should provide:

### Core Administrative Functions

#### 1. Catalog Lifecycle Management
- **Import Management**: Centralized interface for all import methods (local/git/bundle)
- **Version Control**: Promote/demote versions, set latest/stable tags
- **Archival System**: Soft-delete with retention policies
- **Bulk Operations**: Multi-select actions across items/versions

#### 2. Storage Administration
- **Bundle Browser**: Visual interface to explore stored bundles
- **Storage Analytics**: Size, usage, growth metrics
- **Cleanup Tools**: Remove orphaned bundles, compress old versions
- **Backup/Restore**: Export/import catalog state

#### 3. Monitoring & Analytics
- **Execution History**: Track which items are used, success rates
- **Performance Metrics**: Execution times, resource usage
- **Error Analysis**: Failed imports/executions with detailed logs
- **Usage Patterns**: Most/least used items, version adoption

#### 4. Advanced Features
- **Dependency Mapping**: Visualize relationships between catalog items
- **Schema Evolution**: Track schema changes across versions
- **Testing Framework**: Validate catalog items before activation
- **Approval Workflows**: Review process for new/updated items

### Technical Implementation Considerations

#### Backend Extensions Needed
- Extend registry with administrative metadata (created_at, created_by, usage_stats)
- Add soft-delete and archival states
- Implement audit logging for all administrative actions
- Create batch processing endpoints for bulk operations
- Add storage management utilities (cleanup, compression, analytics)

#### Frontend Requirements
- Separate admin interface (`/admin/catalog`) with role-based access
- Data tables with filtering, sorting, pagination
- Bulk selection and batch operations
- Visual dashboards for metrics and analytics
- Import wizards with validation preview
- Drag-drop bundle uploads with progress tracking

#### Database Evolution
- Consider migration from JSON file to proper database (SQLite/PostgreSQL)
- Design schema for audit trails, usage statistics, and relationships
- Implement proper indexing for performance
- Add migration scripts for existing data

#### Security Enhancements
- Admin role authentication and authorization
- API rate limiting for bulk operations
- Input sanitization for all admin functions
- Secure file upload handling

### Deliverables Expected

1. **Database Schema Design**: Proper relational model replacing JSON registry
2. **API Specification**: REST endpoints for all administrative functions
3. **Frontend Architecture**: Component hierarchy and routing for admin interface
4. **Migration Strategy**: Seamless upgrade path from current JSON-based system
5. **Security Model**: Authentication, authorization, and audit framework
6. **Monitoring Integration**: Metrics collection and dashboard visualization

### Success Criteria

The implemented solution should:
- Provide complete lifecycle management for catalog items
- Scale to hundreds of catalog items with good performance
- Maintain backward compatibility with existing user interface
- Include comprehensive audit trails for compliance
- Support bulk operations for efficiency
- Offer intuitive UX for non-technical administrators

Please provide a detailed architectural plan with implementation phases, technical specifications, and code examples for this catalog administration dashboard.
