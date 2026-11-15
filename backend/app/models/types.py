"""
Custom Database Column Types
Provides PostGIS Geometry Point with safe SQLite fallback for testing.
"""

from sqlalchemy.types import TypeDecorator, String

try:
    from geoalchemy2 import Geometry
    HAS_GEOALCHEMY = True
except ImportError:
    Geometry = None
    HAS_GEOALCHEMY = False


class PostGISPoint(TypeDecorator):
    """
    PostGIS Point Geometry type.
    Compiles to PostGIS `Geometry('POINT', srid=4326)` on PostgreSQL,
    and falls back to String(64) on SQLite to allow testing without SpatiaLite.
    """

    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql" and HAS_GEOALCHEMY and Geometry is not None:
            return dialect.type_descriptor(Geometry(geometry_type="POINT", srid=4326))
        return dialect.type_descriptor(String(64))

