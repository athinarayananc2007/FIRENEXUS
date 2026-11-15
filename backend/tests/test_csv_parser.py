"""
Tests for NASA FIRMS CSV Processing Engine
Validates MODIS and VIIRS schema normalization, coordinate bounds checking,
confidence mapping, time formatting, and deduplication hashing.
"""

from app.services.csv_parser import FirmsCsvParser

MODIS_SAMPLE_CSV = """latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp,daynight
-14.234,132.567,335.4,1.2,1.1,2024-05-18,0435,T,85,6.1N,298.2,34.5,D
-14.250,132.580,312.0,1.0,1.0,2024-05-18,1340,Aqua,45,6.1N,290.0,12.0,N
"""

VIIRS_SAMPLE_CSV = """latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_ti5,frp,daynight
-14.234,132.567,342.1,0.4,0.4,2024-05-18,0435,N,nominal,2.0NRT,295.4,15.2,D
-14.280,132.610,367.8,0.38,0.36,2024-05-18,0525,1,high,2.0NRT,301.2,55.8,D
"""

INVALID_COORDINATES_CSV = """latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp,daynight
-95.000,132.567,335.4,1.2,1.1,2024-05-18,0435,T,85,6.1N,298.2,34.5,D
-14.234,195.000,335.4,1.2,1.1,2024-05-18,0435,T,85,6.1N,298.2,34.5,D
-14.234,132.567,335.4,1.2,1.1,2024-05-18,0435,T,85,6.1N,298.2,34.5,D
"""


def test_parse_modis_csv():
    """Verify parsing and normalization of MODIS CSV records."""
    records, errors = FirmsCsvParser.parse_csv_stream(MODIS_SAMPLE_CSV, "MODIS_NRT")
    assert len(errors) == 0
    assert len(records) == 2

    # First record (Terra, Daytime, high confidence >= 80)
    rec1 = records[0]
    assert rec1["sensor"] == "MODIS"
    assert rec1["satellite"] == "Terra"
    assert rec1["acq_time"] == "04:35"
    assert rec1["confidence"] == "high"
    assert rec1["confidence_raw"] == "85"
    assert rec1["brightness"] == 335.4
    assert rec1["bright_secondary"] == 298.2
    assert rec1["frp"] == 34.5
    assert rec1["day_night"] == "D"
    assert len(rec1["dedup_hash"]) == 64

    # Second record (Aqua, Nighttime, nominal confidence)
    rec2 = records[1]
    assert rec2["satellite"] == "Aqua"
    assert rec2["confidence"] == "nominal"
    assert rec2["confidence_raw"] == "45"
    assert rec2["day_night"] == "N"


def test_parse_viirs_csv():
    """Verify parsing and normalization of VIIRS 375 m CSV records."""
    records, errors = FirmsCsvParser.parse_csv_stream(VIIRS_SAMPLE_CSV, "VIIRS_SNPP_NRT")
    assert len(errors) == 0
    assert len(records) == 2

    # First record (Suomi-NPP)
    rec1 = records[0]
    assert rec1["sensor"] == "VIIRS"
    assert rec1["satellite"] == "Suomi-NPP"
    assert rec1["brightness"] == 342.1
    assert rec1["bright_secondary"] == 295.4
    assert rec1["confidence"] == "nominal"
    assert rec1["scan"] == 0.4
    assert rec1["track"] == 0.4

    # Second record ('1' maps to NOAA-20)
    rec2 = records[1]
    assert rec2["satellite"] == "NOAA-20"
    assert rec2["confidence"] == "high"
    assert rec2["frp"] == 55.8


def test_invalid_coordinates_filtering():
    """Verify latitude < -90 or longitude > 180 is rejected into error list."""
    records, errors = FirmsCsvParser.parse_csv_stream(INVALID_COORDINATES_CSV, "MODIS_NRT")
    # Only 1 of 3 rows is valid
    assert len(records) == 1
    assert len(errors) == 2
    assert "out of WGS84 bounds" in errors[0]["error"]


def test_time_normalization():
    """Test various input time formats (435, 0435, 0)."""
    assert FirmsCsvParser._normalize_time("435")[0] == "04:35"
    assert FirmsCsvParser._normalize_time("1200")[0] == "12:00"
    assert FirmsCsvParser._normalize_time("5")[0] == "00:05"
    assert FirmsCsvParser._normalize_time("invalid")[0] == "00:00"


def test_dedup_hash_stability():
    """Verify deduplication hash is deterministic across identical inputs."""
    h1 = FirmsCsvParser.generate_dedup_hash(
        "MODIS_NRT", -12.34567, 130.12345, "2024-05-18", "04:35", "Terra", 1.0, 1.0
    )
    h2 = FirmsCsvParser.generate_dedup_hash(
        "MODIS_NRT", -12.34567, 130.12345, "2024-05-18", "04:35", "Terra", 1.0, 1.0
    )
    assert h1 == h2

    # Different source product must yield different hash to preserve both sensors
    h_viirs = FirmsCsvParser.generate_dedup_hash(
        "VIIRS_SNPP_NRT", -12.34567, 130.12345, "2024-05-18", "04:35", "Suomi-NPP", 0.375, 0.375
    )
    assert h1 != h_viirs

