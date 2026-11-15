"""
FIRENEXUS Backend Server Entrypoint
Starts the Flask WSGI development server.
"""

import os
from app import create_app

# Create application using FLASK_ENV or default 'development'
env = os.getenv("FLASK_ENV", "development")
app = create_app(env)

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "5000"))
    debug = app.config.get("DEBUG", True)

    print("=" * 70)
    print("  FIRENEXUS - Global Satellite Active Fire Harmonization API")
    print("=" * 70)
    print(f"  Environment:  {env}")
    print(f"  API Root:     http://{host}:{port}/api/v1")
    print(f"  Health Check: http://{host}:{port}/api/v1/health")
    print(f"  CORS Allowed: {', '.join(app.config.get('CORS_ORIGINS', []))}")
    print("=" * 70)

    app.run(host=host, port=port, debug=debug)

