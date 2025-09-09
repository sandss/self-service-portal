# Catalog Import System Documentation

The Self-Service Portal features a comprehensive catalog import system that allows you to import catalog items from Git repositories with automatic bundle management and version tracking.

## Overview

The catalog import system provides:

- **Git-based Imports**: Import catalog items directly from Git repositories
- **Version Management**: Automatic version detection from Git tags
- **Bundle Storage**: Efficient compressed storage with on-demand extraction
- **Job Tracking**: Real-time import progress with detailed job status
- **Hybrid Execution**: Automatic extraction for execution with cleanup management

## Architecture

```
Git Repository → Import Job → Bundle Storage → On-Demand Extraction → Execution
     ↓              ↓             ↓              ↓                   ↓
   tag/branch   ARQ Worker    .tar.gz files   catalog_local/     task.py
```

### Storage Strategy

1. **Bundle Storage**: Imported items are stored as compressed `.tar.gz` files in `/app/data/bundles/`
2. **On-Demand Extraction**: Files are extracted to `/app/catalog_local/items/` only when needed for execution
3. **Automatic Cleanup**: Extracted files are removed during deletion operations

## Import Methods

### 1. Git Import API

**Endpoint**: `POST /catalog/git/import`

**Import from Tag (Recommended)**:
```bash
curl -X POST "http://localhost:8000/catalog/git/import" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/user/my-catalog-item",
    "item_name": "my-catalog-item", 
    "version": "1.2.3"
  }'
```

**Import from Branch**:
```bash
curl -X POST "http://localhost:8000/catalog/git/import" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/user/my-catalog-item",
    "item_name": "my-catalog-item",
    "branch": "main"
  }'
```

**Local Repository Import**:
```bash
curl -X POST "http://localhost:8000/catalog/git/import" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "file:///app/mock-catalog-repos/ssl-certificate-check",
    "item_name": "ssl-certificate-check",
    "version": "1.2.3"
  }'
```

### 2. Response Format

Successful import returns:
```json
{
  "queued": true,
  "repo_url": "https://github.com/user/my-catalog-item",
  "item_name": "my-catalog-item",
  "source_type": "tag",
  "source_ref": "1.2.3",
  "ref": "my-catalog-item@1.2.3",
  "job_id": "fbadedab-a4e6-42b7-96ca-ea0bfb14b3d1"
}
```

## Repository Structure Requirements

Your Git repository must have the following structure:

### Flat Structure (Recommended)
```
my-catalog-item/
├── manifest.yaml       # Required: Item metadata
├── schema.json        # Required: Input validation schema
├── task.py           # Required: Execution logic
├── ui.json           # Optional: UI form configuration
├── README.md         # Optional: Documentation
└── pyproject.toml    # Optional: Dependencies
```

### Nested Structure (Alternative)
```
my-catalog-item/
└── items/
    └── my-catalog-item/
        ├── manifest.yaml
        ├── schema.json
        ├── task.py
        ├── ui.json
        ├── README.md
        └── pyproject.toml
```

## Required Files

### 1. manifest.yaml
```yaml
name: "my-catalog-item"
version: "1.2.3"
description: "Description of what this catalog item does"
author: "Your Name"
maintainer: "maintainer@example.com"
tags:
  - infrastructure
  - monitoring
category: "Infrastructure"
icon: "server"
schema_version: "1.0"
deprecated: false
```

### 2. schema.json (JSON Schema)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "Configuration",
  "description": "Configuration schema for the catalog item",
  "properties": {
    "server_name": {
      "type": "string",
      "title": "Server Name",
      "description": "The name of the server to process"
    },
    "timeout": {
      "type": "integer",
      "title": "Timeout (seconds)",
      "description": "Operation timeout in seconds",
      "default": 30,
      "minimum": 1,
      "maximum": 300
    }
  },
  "required": ["server_name"]
}
```

### 3. task.py (Execution Logic)
```python
import asyncio
from typing import Dict, Any, Callable

async def validate(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate inputs before execution.
    
    Args:
        inputs: Dictionary of input parameters
        
    Returns:
        Dictionary with validation results
        
    Raises:
        ValueError: If validation fails
    """
    if not inputs.get("server_name"):
        raise ValueError("server_name is required")
    
    return {"valid": True, "message": "Validation successful"}

async def run(inputs: Dict[str, Any], progress_callback: Callable[[float, str], None] = None) -> Dict[str, Any]:
    """
    Main execution function.
    
    Args:
        inputs: Dictionary of validated input parameters
        progress_callback: Optional callback for progress updates
        
    Returns:
        Dictionary with execution results
    """
    server_name = inputs["server_name"]
    timeout = inputs.get("timeout", 30)
    
    if progress_callback:
        await progress_callback(10.0, "Starting processing...")
    
    # Your implementation logic here
    await asyncio.sleep(1)  # Simulate work
    
    if progress_callback:
        await progress_callback(50.0, f"Processing server {server_name}...")
    
    # More work...
    await asyncio.sleep(1)
    
    if progress_callback:
        await progress_callback(100.0, "Processing complete")
    
    return {
        "success": True,
        "server_name": server_name,
        "processing_time": f"{timeout}s",
        "timestamp": "2025-09-07T10:30:00Z",
        "details": {
            "status": "completed",
            "message": f"Successfully processed {server_name}"
        }
    }
```

### 4. ui.json (Optional UI Schema)
```json
{
  "server_name": {
    "ui:placeholder": "Enter server hostname or IP",
    "ui:help": "The fully qualified domain name or IP address"
  },
  "timeout": {
    "ui:widget": "range",
    "ui:help": "Adjust based on expected operation complexity"
  }
}
```

## Import Process Flow

### 1. Job Creation
- Import request creates an ARQ job with type `"git_import"`
- Job ID is returned immediately for tracking
- Job status is stored in Redis with initial `"QUEUED"` state

### 2. Repository Processing
1. **Clone Repository**: Worker clones the Git repository to temporary directory
2. **Checkout Reference**: Checks out the specified tag or branch
3. **Structure Detection**: Automatically detects flat vs nested repository structure
4. **File Validation**: Validates presence of required files (manifest.yaml, schema.json, task.py)
5. **Version Matching**: Ensures manifest version matches Git tag (if using tags)

### 3. Bundle Creation
1. **Descriptor Loading**: Loads and validates manifest.yaml, schema.json, ui.json
2. **Bundle Packaging**: Creates compressed .tar.gz bundle with all files
3. **Storage**: Saves bundle to `/app/data/bundles/{item_id}@{version}.tar.gz`

### 4. Registry Update
1. **JSON Registry**: Updates `/app/data/catalog_registry.json` (source of truth)
2. **Database Sync**: Dual-writes to PostgreSQL database (if enabled)
3. **Metadata Storage**: Stores manifest, schema, UI config, and storage URI

## Job Status Tracking

Import jobs can be tracked via the `/jobs` endpoint:

```bash
# List recent jobs
curl "http://localhost:8000/jobs?page=1&page_size=10"

# Get specific job details
curl "http://localhost:8000/jobs/{job_id}"
```

### Job States
- `QUEUED`: Job is waiting to be processed
- `IN_PROGRESS`: Worker is actively processing the import
- `SUCCEEDED`: Import completed successfully
- `FAILED`: Import failed (check error field for details)

### Job Types
- `git_import`: Git repository import jobs
- `catalog_execution`: Catalog item execution jobs

## Version Management

### Git Tags
- Use semantic versioning (e.g., `1.2.3`, `v2.0.0`) 
- Tag names should match the version in `manifest.yaml`
- Each tag creates a separate version in the catalog

### Version Resolution
- **Latest**: System automatically resolves latest version for execution
- **Specific**: Users can execute specific versions
- **Multiple**: Multiple versions of the same item can coexist

## Execution System

### Hybrid Approach
1. **Bundle Storage**: Items stored as compressed bundles for efficiency
2. **On-Demand Extraction**: Bundles extracted to `catalog_local/` only when executed
3. **Dynamic Loading**: `task.py` files loaded fresh for each execution
4. **Automatic Cleanup**: Extracted files removed during deletion

### Execution Flow
```
User Request → Bundle Lookup → Extract to catalog_local/ → Load task.py → Execute → Return Results
```

## Management Operations

### Listing Items
```bash
curl "http://localhost:8000/catalog"
```

### Getting Item Details
```bash
curl "http://localhost:8000/catalog/{item_id}/latest/descriptor"
curl "http://localhost:8000/catalog/{item_id}/{version}/descriptor"
```

### Deleting Items
```bash
# Delete specific version
curl -X DELETE "http://localhost:8000/catalog/{item_id}/{version}"

# Delete entire item (all versions)
curl -X DELETE "http://localhost:8000/catalog/{item_id}"
```

**Note**: Deletion removes both bundles and any extracted files in `catalog_local/`.

## Error Handling

### Common Import Errors

1. **Missing Required Files**:
   ```json
   {
     "error": "[Errno 2] No such file or directory: '/tmp/tmp.../manifest.yaml'"
   }
   ```
   **Solution**: Ensure repository has manifest.yaml, schema.json, and task.py

2. **Version Mismatch**:
   ```json
   {
     "error": "manifest version '1.2.1' must match version '1.2.0' from tag"
   }
   ```
   **Solution**: Update manifest.yaml version to match Git tag

3. **Invalid Schema**:
   ```json
   {
     "error": "Invalid JSON Schema: ..."
   }
   ```
   **Solution**: Validate schema.json against JSON Schema Draft 7

4. **Repository Access**:
   ```json
   {
     "error": "Failed to fetch 'main' as tag or branch: ..."
   }
   ```
   **Solution**: Check repository URL and access permissions

## Testing with Mock Repositories

The system includes mock repositories for testing:

```bash
# Import SSL certificate check
curl -X POST "http://localhost:8000/catalog/git/import" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "file:///app/mock-catalog-repos/ssl-certificate-check",
    "item_name": "ssl-certificate-check",
    "version": "1.2.3"
  }'

# Import database backup
curl -X POST "http://localhost:8000/catalog/git/import" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "file:///app/mock-catalog-repos/database-backup", 
    "item_name": "database-backup",
    "version": "2.0.0"
  }'
```

## Best Practices

### Repository Organization
- Use semantic versioning for Git tags
- Keep repositories focused on single catalog items
- Include comprehensive README.md documentation
- Use consistent naming conventions

### Schema Design
- Provide clear titles and descriptions for all fields
- Use appropriate validation constraints (min/max, patterns)
- Include helpful defaults where appropriate
- Separate UI concerns into ui.json

### Task Implementation
- Implement both `validate()` and `run()` functions
- Use progress callbacks for long-running operations
- Return structured, meaningful results
- Handle errors gracefully with informative messages

### Version Management
- Tag releases consistently (e.g., v1.2.3)
- Update manifest.yaml version to match tags
- Document breaking changes between versions
- Maintain backward compatibility when possible

## Troubleshooting

### Import Issues
1. Check job status in dashboard (`/jobs`)
2. Verify repository structure and required files
3. Validate JSON Schema syntax
4. Ensure Git repository is accessible
5. Check manifest.yaml version matches tag

### Execution Issues
1. Verify bundle extraction succeeded
2. Check task.py syntax and dependencies
3. Review execution logs in worker
4. Validate input parameters against schema

### Performance
- Large repositories may take longer to clone
- Bundle extraction happens on-demand for efficiency
- Multiple versions are stored separately
- Cleanup removes both bundles and extracted files
