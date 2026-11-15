"""
NASA FIRMS CSV Processing Engine
Safely parses streaming or in-memory CSV data for MODIS and VIIRS satellite active fire observations.
Normalizes heterogeneous sensor schemas, validates coordinates and radiometry,
and preserves all original source metadata verbatim.
"""

import csv
import io
import hashlib
import logging
from datetime import datetime, date, timezone
from typing import Any, Generator

logger = logging.getLogger(__name__)


class CsvParseError(Exception):
    """Exception raised when a critical CSV parsing failure occurs."""
    pass


class FirmsCsvParser:
    """
    Parser for NASA FIRMS CSV streams supporting MODIS and VIIRS products.
    """

    @staticmethod
    def _normalize_time(time_str: str) -> tuple[str, int, int]:
        """
        Normalizes NASA FIRMS acquisition time string (HHMM or HMM) to formatted 'HH:MM'
        and returns (formatted_time, hours, minutes).
        """
        clean_time = time_str.strip().replace(":", "")
        if not clean_time.isdigit():
            return "00:00", 0, 0

        # Pad to 4 digits (e.g., '435' -> '0435', '5' -> '0005')
        padded = clean_time.zfill(4)
        hours = int(padded[:2])
        minutes = int(padded[2:4])

        # Clamp hours and minutes to valid time bounds
        hours = max(0, min(23, hours))
        minutes = max(0, min(59, minutes))

        return f"{hours:02d}:{minutes:02d}", hours, minutes

    @staticmethod
    def _normalize_modis_satellite(sat_str: str) -> str:
        """Normalizes MODIS satellite platform designators ('T' -> 'Terra', 'A' -> 'Aqua')."""
        s = sat_str.strip().upper()
        if s in ("T", "TERRA"):
            return "Terra"
        if s in ("A", "AQUA"):
            return "Aqua"
        return sat_str.strip() or "Terra"

    @staticmethod
    def _normalize_viirs_satellite(sat_str: str, source_product: str) -> str:
        """Normalizes VIIRS satellite platform designators ('N' -> 'Suomi-NPP', '1'/'20' -> 'NOAA-20', '2'/'21' -> 'NOAA-21')."""
        s = sat_str.strip().upper()
        if s in ("N", "NPP", "SNPP"):
            return "Suomi-NPP"
        if s in ("1", "20", "NOAA20", "NOAA-20"):
            return "NOAA-20"
        if s in ("2", "21", "NOAA21", "NOAA-21"):
            return "NOAA-21"

        # Fallback to source_product if sat_str is empty or unrecognized
        if "NOAA20" in source_product:
            return "NOAA-20"
        if "NOAA21" in source_product:
            return "NOAA-21"
        if "SNPP" in source_product:
            return "Suomi-NPP"
        return "Suomi-NPP"

    @staticmethod
    def _normalize_confidence(conf_str: str, sensor: str) -> tuple[str, str]:
        """
        Normalizes confidence values into standard ('low', 'nominal', 'high')
        and returns (normalized_confidence, raw_confidence_string).
        """
        raw = conf_str.strip()
        lowered = raw.lower()

        if sensor == "MODIS":
            # MODIS provides 0-100 percentage integer
            try:
                score = int(float(raw))
                if score >= 80:
                    return "high", str(score)
                elif score >= 30:
                    return "nominal", str(score)
                else:
                    return "low", str(score)
            except (ValueError, TypeError):
                return "nominal", raw or "nominal"
        else:
            # VIIRS provides 'l', 'n', 'h' or 'low', 'nominal', 'high'
            if lowered in ("h", "high"):
                return "high", raw
            elif lowered in ("l", "low"):
                return "low", raw
            else:
                return "nominal", raw

    @classmethod
    def generate_dedup_hash(
        cls,
        source_product: str,
        lat: float,
        lon: float,
        acq_date_str: str,
        acq_time_str: str,
        satellite: str,
        scan: float | None = None,
        track: float | None = None,
    ) -> str:
        """
        Generates a deterministic SHA256 deduplication hash identifying a unique physical observation.
        Includes source_product so observations from different sensors over the same fire
        are preserved independently.
        """
        scan_val = f"{scan:.2f}" if scan is not None else "0.00"
        track_val = f"{track:.2f}" if track is not None else "0.00"
        identity_string = (
            f"{source_product}:{lat:.5f}:{lon:.5f}:{acq_date_str}:{acq_time_str}:{satellite}:{scan_val}:{track_val}"
        )
        return hashlib.sha256(identity_string.encode("utf-8")).hexdigest()

    @classmethod
    def parse_csv_stream(
        cls,
        csv_data: str | io.TextIOBase,
        source_product: str,
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """
        Parses NASA FIRMS CSV text into validated observation dictionary records.
        
        Args:
            csv_data: String or file-like object containing raw CSV from NASA FIRMS.
            source_product: Identifier (e.g. 'MODIS_NRT', 'VIIRS_SNPP_NRT')
            
        Returns:
            Tuple of (valid_observations_list, parsing_errors_list).
        """
        if isinstance(csv_data, str):
            f = io.StringIO(csv_data.strip())
        else:
            f = csv_data

        reader = csv.DictReader(f)
        if not reader.fieldnames:
            logger.info("Empty CSV stream received (no headers).")
            return [], []

        # Clean fieldnames (strip whitespace)
        fieldnames = [fn.strip() for fn in reader.fieldnames]
        reader.fieldnames = fieldnames

        # Determine sensor type from source_product or headers
        is_modis = "MODIS" in source_product or "brightness" in fieldnames
        sensor = "MODIS" if is_modis else "VIIRS"
        product_type = "SP" if "_SP" in source_product else "NRT"

        valid_records = []
        errors = []

        line_num = 1
        for row in reader:
            line_num += 1
            try:
                # 1. Geographic Coordinates validation
                lat_str = row.get("latitude") or row.get("lat")
                lon_str = row.get("longitude") or row.get("lon")
                if not lat_str or not lon_str:
                    errors.append({"line": line_num, "error": "Missing latitude or longitude", "row": row})
                    continue

                lat = float(lat_str)
                lon = float(lon_str)

                # WGS84 coordinate boundary validation
                if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
                    errors.append({
                        "line": line_num,
                        "error": f"Coordinates out of WGS84 bounds (lat={lat}, lon={lon})",
                        "row": row,
                    })
                    continue

                # 2. Acquisition Date validation
                acq_date_raw = row.get("acq_date", "").strip()
                if not acq_date_raw:
                    errors.append({"line": line_num, "error": "Missing acq_date", "row": row})
                    continue

                try:
                    obs_date = date.fromisoformat(acq_date_raw)
                except ValueError:
                    errors.append({"line": line_num, "error": f"Invalid date format: {acq_date_raw}", "row": row})
                    continue

                # 3. Acquisition Time normalization
                acq_time_raw = row.get("acq_time", "0000").strip()
                time_str, hours, minutes = cls._normalize_time(acq_time_raw)

                # Combined UTC datetime
                acq_datetime = datetime(
                    obs_date.year,
                    obs_date.month,
                    obs_date.day,
                    hours,
                    minutes,
                    tzinfo=timezone.utc,
                )

                # 4. Satellite Platform normalization
                raw_satellite = row.get("satellite", "").strip()
                if is_modis:
                    satellite = cls._normalize_modis_satellite(raw_satellite)
                else:
                    satellite = cls._normalize_viirs_satellite(raw_satellite, source_product)

                # 5. Radiometric Temperature & FRP values
                # MODIS uses 'brightness' (4 µm) & 'bright_t31' (11 µm)
                # VIIRS uses 'bright_ti4' (4 µm) & 'bright_ti5' (11 µm)
                if is_modis:
                    b_primary_str = row.get("brightness", "0")
                    b_secondary_str = row.get("bright_t31")
                else:
                    b_primary_str = row.get("bright_ti4") or row.get("brightness", "0")
                    b_secondary_str = row.get("bright_ti5") or row.get("bright_t31")

                brightness = float(b_primary_str) if b_primary_str else 300.0
                bright_secondary = float(b_secondary_str) if b_secondary_str else None

                # Fire Radiative Power (MW)
                frp_str = row.get("frp", "0").strip()
                frp = max(0.0, float(frp_str)) if frp_str else 0.0

                # 6. Confidence rating
                conf_raw = row.get("confidence", "").strip()
                confidence, conf_raw_val = cls._normalize_confidence(conf_raw, sensor)

                # 7. Solar Day/Night flag
                day_night = row.get("daynight", "").strip().upper()
                if day_night not in ("D", "N"):
                    # Fallback approximation from local solar hour
                    local_hour = (hours + lon / 15.0) % 24
                    day_night = "D" if 6.0 <= local_hour <= 18.0 else "N"

                # 8. Footprint dimensions & version
                scan = float(row.get("scan", "0")) if row.get("scan") else None
                track = float(row.get("track", "0")) if row.get("track") else None
                version = row.get("version", "").strip() or None

                # 9. Deduplication hash & unique ID
                dedup_hash = cls.generate_dedup_hash(
                    source_product=source_product,
                    lat=lat,
                    lon=lon,
                    acq_date_str=obs_date.isoformat(),
                    acq_time_str=time_str,
                    satellite=satellite,
                    scan=scan,
                    track=track,
                )

                short_hash = dedup_hash[:8]
                date_compact = obs_date.isoformat().replace("-", "")
                time_compact = time_str.replace(":", "")
                obs_id = f"{sensor}_{satellite}_{date_compact}_{time_compact}_{short_hash}"

                record = {
                    "id": obs_id,
                    "dedup_hash": dedup_hash,
                    "source_product": source_product,
                    "sensor": sensor,
                    "satellite": satellite,
                    "product_type": product_type,
                    "acq_date": obs_date,
                    "acq_time": time_str,
                    "acq_datetime": acq_datetime,
                    "latitude": lat,
                    "longitude": lon,
                    "brightness": brightness,
                    "bright_secondary": bright_secondary,
                    "frp": frp,
                    "confidence": confidence,
                    "confidence_raw": conf_raw_val,
                    "day_night": day_night,
                    "scan": scan,
                    "track": track,
                    "version": version,
                    "raw_data": dict(row),
                }

                valid_records.append(record)

            except Exception as row_err:
                errors.append({"line": line_num, "error": str(row_err), "row": row})

        logger.info(
            f"CSV parsing complete for {source_product}: {len(valid_records)} valid records, {len(errors)} errors/malformed rows."
        )
        return valid_records, errors
