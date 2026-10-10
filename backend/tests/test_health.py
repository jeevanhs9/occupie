def test_health_endpoint_returns_ok(client):
    """Test that GET /api/v1/health returns 200 with standard health contract."""
    response = client.get('/api/v1/health')
    assert response.status_code == 200

    data = response.get_json()
    assert data is not None
    assert data['status'] == 'ok'
    assert data['service'] == 'occupie-api'
    assert data['version'] == 'v1'
    assert 'database' in data
    assert 'endpoints' in data
    assert data['endpoints']['reservations'] == '/api/v1/reservations'
    assert data['endpoints']['tables'] == '/api/v1/tables'
    assert data['planned_endpoints'] == {
        'auth': '/api/v1/auth',
        'analytics': '/api/v1/analytics',
    }


def test_404_error_handler_json_format(client):
    """Test that invalid routes return standardized JSON error responses."""
    response = client.get('/api/v1/nonexistent-route')
    assert response.status_code == 404

    data = response.get_json()
    assert data is not None
    assert data['error'] == 'Resource Not Found'
    assert data['status_code'] == 404
    assert data['service'] == 'occupie-api'


def test_cors_preflight_headers(client):
    """Test that OPTIONS preflight request handles CORS properly."""
    response = client.open(
        '/api/v1/health',
        method='OPTIONS',
        headers={
            'Origin': 'http://localhost:5173',
            'Access-Control-Request-Method': 'GET',
        }
    )
    assert response.status_code == 200
    assert response.headers.get('Access-Control-Allow-Origin') == 'http://localhost:5173'
