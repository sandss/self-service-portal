#!/usr/bin/env python3
"""
Script entry points for Poetry
"""
import subprocess
import sys

def start_api():
    """Start the FastAPI application"""
    subprocess.run([
        sys.executable, "-m", "uvicorn", 
        "api.main:app", 
        "--host", "0.0.0.0", 
        "--port", "8000", 
        "--reload"
    ])

if __name__ == "__main__":
    start_api()
