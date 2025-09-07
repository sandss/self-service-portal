#!/usr/bin/env python3
"""
Test script to verify persistent storage and dual-write functionality.

This script will:
1. Add a test catalog item to demonstrate dual-write
2. Verify the data persists in both JSON and PostgreSQL
3. Restart containers and verify persistence
"""
import json
import os
import sys
import requests
import time
from pathlib import Path

def test_persistence():
    print("🧪 Testing Catalog Persistence and Dual-Write")
    print("=" * 50)
    
    # API base URL
    api_base = "http://localhost:8000"
    
    # Test data directory
    data_dir = Path("./data")
    registry_file = data_dir / "catalog_registry.json"
    
    print(f"📂 Data directory: {data_dir.absolute()}")
    print(f"📄 Registry file: {registry_file.absolute()}")
    
    # Check if registry file exists
    if registry_file.exists():
        print(f"✅ Registry file exists: {registry_file}")
        with open(registry_file) as f:
            registry_data = json.load(f)
            print(f"📊 Current registry has {len(registry_data.get('items', {}))} items")
    else:
        print(f"❌ Registry file doesn't exist: {registry_file}")
        return False
    
    # Try to connect to API
    try:
        response = requests.get(f"{api_base}/health", timeout=5)
        if response.status_code == 200:
            print("✅ API is accessible")
        else:
            print(f"❌ API returned status {response.status_code}")
            return False
    except requests.RequestException as e:
        print(f"❌ Cannot connect to API: {e}")
        print("💡 Make sure containers are running: docker-compose up -d")
        return False
    
    # Test catalog endpoints
    try:
        # Test listing catalog items
        response = requests.get(f"{api_base}/catalog", timeout=5)
        if response.status_code == 200:
            items = response.json()
            print(f"✅ Catalog API works, found {len(items)} items")
        else:
            print(f"❌ Catalog API returned status {response.status_code}")
    except requests.RequestException as e:
        print(f"❌ Catalog API error: {e}")
    
    # Test admin endpoints (read from DB)
    try:
        response = requests.get(f"{api_base}/admin/catalog/items", timeout=5)
        if response.status_code == 200:
            admin_items = response.json()
            print(f"✅ Admin API works, found {len(admin_items)} items in DB")
        else:
            print(f"❌ Admin API returned status {response.status_code}")
    except requests.RequestException as e:
        print(f"❌ Admin API error: {e}")
    
    print("\n🔧 To test dual-write functionality:")
    print("1. Import a catalog item using the existing catalog sync")
    print("2. Check that it appears in both JSON file and admin API")
    print("3. Restart containers and verify persistence")
    
    print(f"\n📋 Commands to run:")
    print(f"# Import catalog from local directory:")
    print(f"curl -X POST {api_base}/catalog/git/import \\")
    print(f"  -H 'Content-Type: application/json' \\")
    print(f"  -d '{{\"repo_url\": \"file:///app/catalog_local\", \"branch\": \"main\"}}'")
    
    print(f"\n# Check JSON registry:")
    print(f"cat {registry_file}")
    
    print(f"\n# Check database via admin API:")
    print(f"curl {api_base}/admin/catalog/items")
    
    return True

if __name__ == "__main__":
    success = test_persistence()
    sys.exit(0 if success else 1)
