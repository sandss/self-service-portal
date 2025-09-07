# Persistent Storage and Dual-Write Setup

## The Problem You Identified

You're absolutely right! The `catalog_registry.json` file exists only inside the container and doesn't persist between container restarts unless we:

1. **Initialize the file properly** in the persistent volume
2. **Ensure the dual-write repository actually writes to both JSON and DB**
3. **Handle the case where the JSON file doesn't exist yet**

## Current State

- ✅ Volume mount: `catalog_data:/app/data` 
- ✅ Repository reads from: `/app/data/catalog_registry.json`
- ❌ File might not exist initially
- ❌ Dual-write not yet fully integrated into the catalog import process

## Solutions

### 1. Initialize Empty Registry File

Create an empty registry file that will persist:

```bash
# Create the file on host (will be mounted into container)
mkdir -p ./data
echo '{"items": {}}' > ./data/catalog_registry.json
```

### 2. Update Docker Compose for Better Volume Handling

Option A: Bind mount to local directory:
```yaml
volumes:
  - ./data:/app/data  # Direct bind mount to local directory
```

Option B: Initialize the volume with a startup script:
```yaml
services:
  api:
    # ... existing config ...
    entrypoint: ["/app/scripts/init_and_start.sh"]
```

### 3. Make Repository Robust

Update the repository to handle missing files gracefully and ensure dual-write works.

## Let's Implement the Fix

I'll show you both approaches and let you choose:
