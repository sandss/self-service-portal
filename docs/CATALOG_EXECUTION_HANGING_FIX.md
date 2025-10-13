# Catalog Execution Job Hanging - Root Cause and Fix

## Issue Summary
Job `b4aeb3bc2b2e4bd4a5c2e750aededde5` was stuck in "RUNNING" state indefinitely even though it had actually failed with a validation error.

## Root Cause

The issue was in `/worker/catalog_execute.py` in the `run_catalog_item()` function:

```python
async def run_catalog_item(ctx, item_id: str, version: str, inputs: Dict[str, Any], user_id: str | None = None):
    ar = ctx["redis"]
    job_id = ctx["job_id"]
    await set_status(ar, job_id, "RUNNING", {"progress": 0})

    desc = get_descriptor(item_id, version)
    if not desc:
        await set_status(ar, job_id, "FAILED", {"error": "descriptor not found"}); return

    schema = desc["schema"]
    validate_inputs(schema, inputs)  # ❌ ERROR: This was OUTSIDE the try-catch block

    item_path = get_local_catalog_item_path(item_id, version)
    task_path = os.path.join(item_path, "task.py")
    
    try:
        task = _load_task(task_path)
        # ... rest of the code
    except Exception as e:
        await set_status(ar, job_id, "FAILED", {"error": str(e)})
        raise
```

### What Happened

1. Job was submitted with empty inputs: `{"inputs": {}}`
2. The schema requires 3 fields: `client`, `goLiveDate`, and `action`
3. `validate_inputs()` was called **before** the try-catch block
4. When validation failed, it raised `jsonschema.exceptions.ValidationError`
5. The exception was caught by ARQ's job runner, not our try-catch block
6. Our `set_status(ar, job_id, "FAILED", ...)` was never called
7. Job remained stuck at "RUNNING" forever

### Worker Logs
```
worker-1  | 18:47:05:   0.28s → b4aeb3bc2b2e4bd4a5c2e750aededde5:run_catalog_item(inputs={}, item_id='client-connection-request', user_id='demo_user', version='1…)
worker-1  | 18:47:05:   0.01s ! b4aeb3bc2b2e4bd4a5c2e750aededde5:run_catalog_item failed, ValidationError: 'client' is a required property
```

### Redis State (Before Fix)
```json
{
  "id": "b4aeb3bc2b2e4bd4a5c2e750aededde5",
  "state": "RUNNING",  // ❌ Stuck here
  "progress": 0,
  "started_at": "2025-10-13T18:47:05.016821",
  "finished_at": null,  // Never set
  "error": null         // Never set
}
```

## The Fix

### Code Change
Moved `validate_inputs()` **inside** the try-catch block:

```python
async def run_catalog_item(ctx, item_id: str, version: str, inputs: Dict[str, Any], user_id: str | None = None):
    ar = ctx["redis"]
    job_id = ctx["job_id"]
    await set_status(ar, job_id, "RUNNING", {"progress": 0})

    desc = get_descriptor(item_id, version)
    if not desc:
        await set_status(ar, job_id, "FAILED", {"error": "descriptor not found"}); return

    schema = desc["schema"]
    
    item_path = get_local_catalog_item_path(item_id, version)
    task_path = os.path.join(item_path, "task.py")
    
    try:
        # ✅ FIX: Validate inputs inside try-catch so validation errors are properly handled
        validate_inputs(schema, inputs)
        
        task = _load_task(task_path)
        # ... rest of the code
    except Exception as e:
        await set_status(ar, job_id, "FAILED", {"error": str(e)})
        raise
```

### Manual Fix for Hanging Job
Since the job was already stuck, we manually updated it in Redis:

```bash
# Update state to FAILED
docker-compose exec redis redis-cli hset "job:b4aeb3bc2b2e4bd4a5c2e750aededde5" state FAILED

# Add error details
docker-compose exec redis redis-cli hset "job:b4aeb3bc2b2e4bd4a5c2e750aededde5" \
  error '{"type": "ValidationError", "message": "'\''client'\'' is a required property. Failed validating '\''required'\'' in schema."}'

# Set finished timestamp
docker-compose exec redis redis-cli hset "job:b4aeb3bc2b2e4bd4a5c2e750aededde5" \
  finished_at "2025-10-13T18:51:37"
```

### Redis State (After Fix)
```json
{
  "id": "b4aeb3bc2b2e4bd4a5c2e750aededde5",
  "state": "FAILED",  // ✅ Now correct
  "progress": 0,
  "started_at": "2025-10-13T18:47:05.016821",
  "finished_at": "2025-10-13T18:51:37",  // ✅ Set
  "error": {  // ✅ Error details captured
    "type": "ValidationError",
    "message": "'client' is a required property. Failed validating 'required' in schema."
  }
}
```

## Required Schema Fields

For the `client-connection-request` catalog item (v1.0.1), the following fields are **required**:

```json
{
  "client": "string",      // Client name or identifier
  "goLiveDate": "datetime", // Target go-live date/time
  "action": "enum"         // One of: "Install", "Disconnect", "Change"
}
```

## Prevention

This fix ensures that:
1. **All validation errors** are caught and properly recorded
2. **Job status** always transitions to FAILED when errors occur
3. **Error messages** are captured in Redis for debugging
4. **UI/Dashboard** can show the failed state and error details
5. **No more hanging jobs** due to unhandled validation errors

## Testing

To test the fix:
1. Submit a job with invalid/missing inputs
2. Check that job quickly transitions to FAILED state
3. Verify error message is visible in UI
4. Confirm no jobs remain stuck in RUNNING state

## Related Files
- `/worker/catalog_execute.py` - Main execution handler (fixed)
- `/api/catalog/validate.py` - Input validation logic
- `/worker/tasks.py` - Status update helper (`set_status()`)
- `/api/main.py` - Job creation endpoint
