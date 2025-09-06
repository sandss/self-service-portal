import asyncio
import random

def validate(inputs):
    """Validate health check inputs"""
    services = inputs.get("services", [])
    if not services:
        raise ValueError("At least one service must be selected for health check")
    
    timeout = inputs.get("timeout", 30)
    if timeout < 5 or timeout > 300:
        raise ValueError("Timeout must be between 5 and 300 seconds")
    
    return inputs

async def run(inputs, progress_callback=None):
    """
    Run comprehensive system health check with detailed progress reporting
    
    Args:
        inputs: Health check parameters
        progress_callback: Optional async function to report progress
    """
    
    if progress_callback:
        await progress_callback(2, "Initializing system health check")
    
    services = inputs["services"]
    include_performance = inputs.get("includePerformance", False)
    timeout = inputs.get("timeout", 30)
    alert_threshold = inputs.get("alertThreshold", 20)
    
    results = {
        "overall_status": "UNKNOWN",
        "services_checked": len(services),
        "services_healthy": 0,
        "services_unhealthy": 0,
        "performance_tests": include_performance,
        "alert_threshold": alert_threshold,
        "service_results": {},
        "performance_results": {},
        "summary": "",
        "test": "test"
    }
    
    if progress_callback:
        await progress_callback(5, f"Starting health checks for {len(services)} services")
    
    # Health check phase (5% to 70% of progress)
    service_progress_step = 65 / len(services)
    
    for i, service in enumerate(services):
        current_progress = 5 + int(i * service_progress_step)
        
        if progress_callback:
            await progress_callback(current_progress, f"Checking {service} service health")
        
        # Simulate service health check
        check_time = random.uniform(0.1, 0.5)
        await asyncio.sleep(check_time)
        
        # Simulate random health status (90% healthy for demo)
        is_healthy = random.random() > 0.1
        response_time = random.uniform(10, 200)
        
        service_result = {
            "status": "HEALTHY" if is_healthy else "UNHEALTHY",
            "response_time_ms": round(response_time, 2),
            "checked_at": "2024-01-15T11:30:00Z",
            "details": f"{service.capitalize()} service is {'operational' if is_healthy else 'experiencing issues'}"
        }
        
        results["service_results"][service] = service_result
        
        if is_healthy:
            results["services_healthy"] += 1
        else:
            results["services_unhealthy"] += 1
    
    # Performance tests phase (70% to 90% of progress)
    if include_performance:
        if progress_callback:
            await progress_callback(70, "Running performance benchmarks")
        
        performance_tests = ["cpu_usage", "memory_usage", "disk_io", "network_latency"]
        perf_step = 20 / len(performance_tests)
        
        for i, test in enumerate(performance_tests):
            test_progress = 70 + int(i * perf_step)
            
            if progress_callback:
                await progress_callback(test_progress, f"Running {test.replace('_', ' ')} test")
            
            await asyncio.sleep(0.2)  # Simulate performance test
            
            # Generate mock performance data
            if test == "cpu_usage":
                value = random.uniform(10, 80)
                unit = "%"
            elif test == "memory_usage":
                value = random.uniform(30, 85)
                unit = "%"
            elif test == "disk_io":
                value = random.uniform(100, 1000)
                unit = "MB/s"
            else:  # network_latency
                value = random.uniform(1, 50)
                unit = "ms"
            
            results["performance_results"][test] = {
                "value": round(value, 2),
                "unit": unit,
                "status": "GOOD" if value < 70 else "WARNING" if value < 90 else "CRITICAL"
            }
    
    # Final analysis (90% to 100%)
    if progress_callback:
        await progress_callback(90, "Analyzing results and generating report")
    
    await asyncio.sleep(0.2)
    
    # Calculate overall status
    healthy_percentage = (results["services_healthy"] / results["services_checked"]) * 100
    unhealthy_percentage = 100 - healthy_percentage
    
    if unhealthy_percentage == 0:
        results["overall_status"] = "HEALTHY"
        status_message = "All services are healthy"
    elif unhealthy_percentage <= alert_threshold:
        results["overall_status"] = "WARNING"
        status_message = f"{unhealthy_percentage:.1f}% of services are unhealthy (below {alert_threshold}% threshold)"
    else:
        results["overall_status"] = "CRITICAL"
        status_message = f"{unhealthy_percentage:.1f}% of services are unhealthy (exceeds {alert_threshold}% threshold)"
    
    results["summary"] = f"Health check complete: {results['services_healthy']}/{results['services_checked']} services healthy. {status_message}"
    
    if progress_callback:
        await progress_callback(95, "Generating final report")
    
    await asyncio.sleep(0.1)
    
    if progress_callback:
        final_message = f"Health check completed - Status: {results['overall_status']}"
        await progress_callback(100, final_message)
    
    return results
