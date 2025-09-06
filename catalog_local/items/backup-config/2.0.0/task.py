import asyncio

def validate(inputs):
    if isinstance(inputs.get("devices"), str):
        inputs["devices"] = [d.strip() for d in inputs["devices"].splitlines() if d.strip()]
    return inputs

async def run(inputs, progress_callback=None):
    """
    Version 2.0.0 - Enhanced backup task with progress reporting
    
    Args:
        inputs: Task input parameters
        progress_callback: Optional async function to report progress (progress: int, message: str)
    """
    
    # Report initial progress
    if progress_callback:
        await progress_callback(10, "Validating input parameters")
    
    # Enhanced validation for v2.0.0
    if not inputs.get("bucket"):
        raise ValueError("Bucket name is required for backup configuration")
    
    if not inputs.get("devices"):
        raise ValueError("At least one device must be specified")
    
    devices = inputs["devices"]
    bucket = inputs["bucket"]
    prefix = inputs.get("prefix", "")
    
    # Report validation complete
    if progress_callback:
        await progress_callback(25, f"Validation complete. Processing {len(devices)} devices")
    
    # Simulate processing each device with progress updates
    processed_devices = []
    for i, device in enumerate(devices):
        # Simulate device processing time
        await asyncio.sleep(0.2)
        processed_devices.append(device)
        
        # Calculate progress (25% to 90% for device processing)
        progress = 25 + int((i + 1) / len(devices) * 65)
        if progress_callback:
            await progress_callback(progress, f"Processed device {i + 1}/{len(devices)}: {device}")
    
    # Final processing
    if progress_callback:
        await progress_callback(95, "Finalizing backup configuration")
    
    await asyncio.sleep(0.1)  # Simulate final processing
    
    result = {
        "ok": True, 
        "count": len(devices), 
        "bucket": bucket,
        "version": "2.0.0",
        "prefix": prefix,
        "processed_devices": processed_devices,
        "backup_config_created": True
    }
    
    if progress_callback:
        await progress_callback(100, "Backup configuration completed successfully")
    
    return result
