"""
Pytest Fixtures for FIRENEXUS Backend
Sets up the test application, test client, and isolated database.
"""

import pytest
from app import create_app
from app.extensions import db


@pytest.fixture
def app():
    """Create and configure a Flask application for testing."""
    application = create_app("testing")

    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Test client for issuing HTTP requests."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """CLI test runner."""
    return app.test_cli_runner()

