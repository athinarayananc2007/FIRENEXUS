"""
FIRENEXUS Observation Serialization and Validation Schemas
"""

from typing import Any


def serialize_observation(obs) -> dict[str, Any]:
    """Serializes a FireObservation model instance into a standard JSON dictionary."""
    if obs is None:
        return {}
    return {
        "id": obs.id,
        "date": obs.date.isoformat() if hasattr(obs.date, "isoformat") else str(obs.date),
        "time": obs.time,
        "latitude": float(obs.latitude),
        "longitude": float(obs.longitude),
        "satellite": obs.satellite,
        "instrument": obs.instrument,
        "confidence": obs.confidence,
        "brightness": float(obs.brightness),
        "frp": float(obs.frp),
        "day_night": obs.day_night,
        "country": obs.country,
        "region": obs.region,
        "continent": obs.continent,
    }


def serialize_observations_list(observations: list) -> list[dict[str, Any]]:
    """Serializes a list of FireObservation model instances."""
    return [serialize_observation(obs) for obs in observations]

