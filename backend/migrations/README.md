# FIRENEXUS Database Migrations
Generic single-database configuration with Flask-Migrate and Alembic.

To initialize database migrations when connected to PostgreSQL + PostGIS:

```bash
flask db init
flask db migrate -m "Initial fire_observations schema with PostGIS geometry"
flask db upgrade
```

