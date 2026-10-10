def create_table(manager_client, table_id='T01', capacity=4):
    return manager_client.post('/api/v1/tables', json={
        'id': table_id,
        'name': f'Table {table_id}',
        'capacity': capacity,
        'section': 'Main Dining',
    })


def test_table_creation_and_listing(manager_client):
    created = create_table(manager_client)
    assert created.status_code == 201
    assert created.get_json()['table']['capacity'] == 4

    listed = manager_client.get('/api/v1/tables')
    assert listed.status_code == 200
    assert [table['id'] for table in listed.get_json()['tables']] == ['T01']


def test_occupancy_updates_and_clears_seating_details(manager_client):
    create_table(manager_client)
    occupied = manager_client.patch('/api/v1/tables/T01/status', json={
        'status': 'occupied',
        'partySize': 3,
    })
    assert occupied.status_code == 200
    assert occupied.get_json()['table']['partySize'] == 3
    assert occupied.get_json()['table']['timeSeated']

    departed = manager_client.patch('/api/v1/tables/T01/status', json={'status': 'cleaning'})
    assert departed.status_code == 200
    assert departed.get_json()['table']['partySize'] == 0
    assert departed.get_json()['table']['timeSeated'] is None

    ready = manager_client.patch('/api/v1/tables/T01/status', json={'status': 'available'})
    assert ready.status_code == 200
    assert ready.get_json()['table']['status'] == 'available'


def test_occupied_party_must_fit_table(manager_client):
    create_table(manager_client, capacity=2)
    response = manager_client.patch('/api/v1/tables/T01/status', json={
        'status': 'occupied',
        'partySize': 3,
    })
    assert response.status_code == 422
