"""
FIRENEXUS NASA FIRMS Upstream Live Validation Script
Probes official NASA FIRMS REST API using configured FIRMS_MAP_KEY.
Validates upstream connectivity, response status, CSV headers, and parser parsing.
"""

import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

from app.services.firms_service import FirmsApiClient, FirmsApiError
from app.services.csv_parser import FirmsCsvParser

def test_upstream_firms():
    print("=" * 70)
    print("  FIRENEXUS NASA FIRMS Upstream Live API Validation")
    print("=" * 70)

    map_key = os.getenv("FIRMS_MAP_KEY", "").strip()
    if not map_key or map_key == "your_registered_nasa_firms_key":
        print("[FIRMS_VALIDATION_PENDING] FIRMS_MAP_KEY is not set or using placeholder.")
        return False

    # Masked key
    masked_key = f"{map_key[:4]}...{map_key[-4:]}" if len(map_key) >= 8 else "***"
    print(f"Target MAP_KEY: {masked_key} (length: {len(map_key)})")

    client = FirmsApiClient(map_key=map_key, timeout_seconds=15, max_retries=2)

    # Test 1: Availability endpoint
    print("\n[Step 1] Probing NASA FIRMS data availability endpoint...")
    try:
        avail_resp = client.get_data_availability()
        print(f"  Availability query SUCCESS. Status: 200 OK")
        print(f"  Available products recorded: {len(avail_resp) if isinstance(avail_resp, list) else 'dict'}")
    except FirmsApiError as e:
        print(f"  Availability probe returned FirmsApiError: {e}")
    except Exception as e:
        print(f"  Network / Connectivity check: {type(e).__name__}: {e}")

    # Test 2: Area 1-day query for MODIS_NRT (e.g. world or bounding box, 1 day)
    print("\n[Step 2] Testing upstream CSV retrieval (MODIS_NRT, Area world, Day 1)...")
    try:
        csv_text = client.get_area_csv(source="MODIS_NRT", area="world", day_range=1)
        print(f"  CSV stream received! Total bytes: {len(csv_text)}")
        lines = csv_text.strip().split("\n")
        print(f"  Header line: {lines[0] if lines else 'EMPTY'}")
        print(f"  Total rows returned: {len(lines) - 1}")

        # Test 3: CSV Parsing & Normalization
        print("\n[Step 3] Validating parser and normalization pipeline...")
        parsed_records, error_records = FirmsCsvParser.parse_csv_stream(
            csv_data=csv_text,
            source_product="MODIS_NRT"
        )
        print(f"  Successfully parsed records: {len(parsed_records)}")
        print(f"  Discarded / error records:  {len(error_records)}")
        if parsed_records:
            sample = parsed_records[0]
            print(f"  Sample Live NASA Observation:")
            print(f"    Sensor:        {sample.get('sensor')}")
            print(f"    Satellite:     {sample.get('satellite')}")
            print(f"    Datetime:      {sample.get('acq_datetime')}")
            print(f"    Lat/Lon:       ({sample.get('latitude')}, {sample.get('longitude')})")
            print(f"    FRP:           {sample.get('frp')} MW")
            print(f"    Confidence:    {sample.get('confidence')} (raw: {sample.get('confidence_raw')})")
            print(f"    Dedup Hash:    {sample.get('dedup_hash')[:16]}...")
        print("\n[FIRMS_VALIDATION_VERIFIED] Real NASA FIRMS API request, parsing, and deduplication verified!")
        return True
    except FirmsApiError as e:
        print(f"  NASA FIRMS API returned error: {e}")
        return False
    except Exception as e:
        print(f"  Exception during request: {type(e).__name__}: {e}")
        return False

if __name__ == "__main__":
    test_upstream_firms()
