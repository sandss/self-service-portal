#!/usr/bin/env python3
"""
Parity check script to compare JSON registry with PostgreSQL database
"""

import json
import pathlib
import os
import sys

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import select
from api.common.db import SessionLocal
from api.catalog.models import CatalogItem, CatalogVersion

REGISTRY_PATH = "/app/data/catalog_registry.json"

def main():
    """Compare JSON registry with PostgreSQL database"""
    print("🔍 Checking parity between JSON registry and PostgreSQL database")
    print("=" * 70)
    
    # Load JSON registry
    registry_path = pathlib.Path(REGISTRY_PATH)
    if not registry_path.exists():
        print(f"❌ Registry file not found: {REGISTRY_PATH}")
        return
    
    try:
        with open(registry_path) as f:
            reg = json.load(f)
    except Exception as e:
        print(f"❌ Failed to load registry: {e}")
        return
    
    items_json = set(reg.get("items", {}).keys())
    print(f"📋 JSON registry items: {len(items_json)}")
    
    # Check database
    try:
        with SessionLocal() as db:
            items_db = set([r.item_id for r in db.execute(select(CatalogItem)).scalars().all()])
            print(f"🗄️  Database items: {len(items_db)}")
            
            # Check for differences
            missing_in_db = sorted(items_json - items_db)
            missing_in_json = sorted(items_db - items_json)
            
            if missing_in_db:
                print(f"\n⚠️  Missing in DB ({len(missing_in_db)} items):")
                for item in missing_in_db[:10]:  # Show first 10
                    print(f"   - {item}")
                if len(missing_in_db) > 10:
                    print(f"   ... and {len(missing_in_db) - 10} more")
            
            if missing_in_json:
                print(f"\n⚠️  Missing in JSON ({len(missing_in_json)} items):")
                for item in missing_in_json[:10]:  # Show first 10
                    print(f"   - {item}")
                if len(missing_in_json) > 10:
                    print(f"   ... and {len(missing_in_json) - 10} more")
            
            # Check versions for matching items
            matching_items = items_json & items_db
            version_mismatches = []
            
            for item_id in list(matching_items)[:10]:  # Check first 10 matching items
                j_versions = set(reg["items"][item_id]["versions"].keys())
                
                db_item = db.execute(select(CatalogItem).where(CatalogItem.item_id == item_id)).scalar_one_or_none()
                if db_item:
                    db_versions = set(v.version for v in db_item.versions)
                    
                    if j_versions != db_versions:
                        version_mismatches.append({
                            "item_id": item_id,
                            "json_versions": len(j_versions),
                            "db_versions": len(db_versions),
                            "json_only": j_versions - db_versions,
                            "db_only": db_versions - j_versions
                        })
            
            if version_mismatches:
                print(f"\n⚠️  Version mismatches ({len(version_mismatches)} items):")
                for mismatch in version_mismatches:
                    print(f"   - {mismatch['item_id']}: JSON={mismatch['json_versions']}, DB={mismatch['db_versions']}")
                    if mismatch['json_only']:
                        print(f"     JSON only: {list(mismatch['json_only'])}")
                    if mismatch['db_only']:
                        print(f"     DB only: {list(mismatch['db_only'])}")
            
            # Summary
            print(f"\n📊 Summary:")
            print(f"   ✅ Items in both: {len(matching_items)}")
            print(f"   ⚠️  Items only in JSON: {len(missing_in_db)}")
            print(f"   ⚠️  Items only in DB: {len(missing_in_json)}")
            print(f"   ⚠️  Version mismatches: {len(version_mismatches)}")
            
            if not missing_in_db and not missing_in_json and not version_mismatches:
                print(f"\n🎉 Perfect parity! JSON and database are in sync.")
            else:
                print(f"\n⚠️  Parity issues detected. Consider running data migration.")
    
    except Exception as e:
        print(f"❌ Database error: {e}")

if __name__ == "__main__":
    main()
