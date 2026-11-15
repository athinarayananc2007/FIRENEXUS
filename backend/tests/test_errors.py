"""
Tests for Centralized Error Handlers
"""

from app.utils.errors import APIError


def test_404_error_handler(client):
    """Test accessing an unknown route returns JSON with 404 and NOT_FOUND error code."""
    response = client.get("/api/v1/non_existent_endpoint")
    assert response.status_code == 404

    data = response.get_json()
    assert data["status"] == "error"
    assert data["code"] == 404
    assert data["error_code"] == "NOT_FOUND"
    assert "not found" in data["message"].lower()


def test_405_method_not_allowed(client):
    """Test POST to GET-only /api/v1/health returns 405 Method Not Allowed."""
    response = client.post("/api/v1/health")
    assert response.status_code == 405

    data = response.get_json()
    assert data["status"] == "error"
    assert data["code"] == 405
    assert data["error_code"] == "METHOD_NOT_ALLOWED"


def test_custom_api_error_raised(app):
    """Test custom APIError serialization and status code."""
    with app.test_request_context("/test-error"):
        error = APIError("Validation failed", status_code=422, error_code="UNPROCESSABLE_ENTITY")
        res_dict = error.to_dict()
        assert res_dict["status"] == "error"
        assert res_dict["code"] == 422
        assert res_dict["error_code"] == "UNPROCESSABLE_ENTITY"
        assert res_dict["message"] == "Validation failed"

