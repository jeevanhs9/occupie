def test_health_check(client):
    """Test the /api/health endpoint."""
    response = client.get('/api/health')
    assert response.status_code == 200

    json_data = response.get_json()
    assert "status" in json_data
    assert json_data["status"] == "ok"
    assert "database" in json_data
    assert json_data["database"] == "connected"
