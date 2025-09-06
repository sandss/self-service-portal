import asyncio

def validate(inputs):
    if isinstance(inputs.get("devices"), str):
        inputs["devices"] = [d.strip() for d in inputs["devices"].splitlines() if d.strip()]
    return inputs

async def run(inputs, progress_callback=None):
    """
    Version 1.0.0 - Basic backup task with optional progress reporting
    
    Args:
        inputs: Task input parameters
        progress_callback: Optional async function to report progress (progress: int, message: str)
    """
    
    if progress_callback:
        await progress_callback(20, "Starting backup configuration")
    
    # pretend work
    await asyncio.sleep(0.1)
    
    if progress_callback:
        await progress_callback(60, "Processing backup settings")
    
    await asyncio.sleep(0.1)
    
    result = {"ok": True, "count": len(inputs["devices"]), "bucket": inputs["bucket"], "version": "1.0.0"}
    
    if progress_callback:
        await progress_callback(100, "Backup configuration completed")
    
    return result
