import os, tempfile, importlib.util, asyncio, json, inspect
from typing import Any, Dict
from api.catalog.registry import get_descriptor, get_local_catalog_item_path
from api.catalog.bundles import read_blob, unpack_to_temp
from api.catalog.validate import validate_inputs
from .tasks import set_status  # reuse your existing status helper

def _load_task(task_path: str):
    if not os.path.exists(task_path):
        raise FileNotFoundError(f"Required task.py file not found at {task_path}. Each catalog item version must include a task.py file with validate() and run() functions.")
    
    spec = importlib.util.spec_from_file_location("bundle.task", task_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    if not hasattr(mod, "run"):
        raise RuntimeError("task.py must define run(inputs)")
    return mod

async def run_catalog_item(ctx, item_id: str, version: str, inputs: Dict[str, Any], user_id: str | None = None):
    ar = ctx["redis"]
    job_id = ctx["job_id"]
    await set_status(ar, job_id, "RUNNING", {"progress": 0})

    desc = get_descriptor(item_id, version)
    if not desc:
        await set_status(ar, job_id, "FAILED", {"error": "descriptor not found"}); return

    schema = desc["schema"]
    
    # Use versioned local storage directly instead of unpacking from blob
    item_path = get_local_catalog_item_path(item_id, version)
    task_path = os.path.join(item_path, "task.py")
    
    try:
        # Validate inputs inside try-catch so validation errors are properly handled
        validate_inputs(schema, inputs)
        
        task = _load_task(task_path)
        
        # Create progress callback function
        async def progress_callback(progress: int, message: str = None):
            """
            Progress callback for task.py to report real-time progress.
            
            Args:
                progress (int): Progress percentage (0-100)
                message (str, optional): Optional progress message
            """
            status_data = {"progress": progress}
            if message:
                status_data["message"] = message
            await set_status(ar, job_id, "RUNNING", status_data)
        
        # Initial progress
        await set_status(ar, job_id, "RUNNING", {"progress": 5, "message": "Starting task execution"})
        
        # Call task.run() with inputs and progress callback
        # Check if task.run accepts a progress_callback parameter
        import inspect
        sig = inspect.signature(task.run)
        if 'progress_callback' in sig.parameters:
            # Task supports progress callback
            res = task.run(inputs, progress_callback=progress_callback)
        else:
            # Fallback for tasks that don't support progress callback
            res = task.run(inputs)
        
        if asyncio.iscoroutine(res):
            res = await res
            
        await set_status(ar, job_id, "SUCCEEDED", {"result": res, "progress": 100, "message": "Task completed successfully"})
        return res
    except Exception as e:
        await set_status(ar, job_id, "FAILED", {"error": str(e)})
        raise
