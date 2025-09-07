#!/usr/bin/env python3
"""
Script entry points for Poetry
"""
import subprocess
import sys

def start_worker():
    """Start the ARQ worker"""
    subprocess.run([
        sys.executable, "-m", "arq", 
        "worker.worker_settings.WorkerSettings"
    ])

if __name__ == "__main__":
    start_worker()
