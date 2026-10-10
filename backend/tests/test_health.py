def test_health_check(client):
    """Test the /api/health endpoint."""
    response = client.get('/api/health')
    assert response.status_code == 200

    json_data = response.get_json()
    assert "status" in json_data
    assert json_data["status"] == "ok"
    assert "database" in json_data
    assert json_data["database"] == "connected"


def test_configured_frontend_origin_can_preflight_operations(client):
    response = client.options(
        '/api/v1/reservations',
        headers={
            'Origin': 'http://localhost:5173',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type',
        },
    )
    assert response.status_code == 200
    assert response.headers['Access-Control-Allow-Origin'] == 'http://localhost:5173'
    assert 'POST' in response.headers['Access-Control-Allow-Methods']


def test_unconfigured_frontend_origin_is_not_allowed(client):
    response = client.get('/api/v1/health', headers={'Origin': 'https://untrusted.example'})
    assert 'Access-Control-Allow-Origin' not in response.headers
