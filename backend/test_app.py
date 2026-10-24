from app import app


def test_health():
    client = app.test_client()
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json["status"] == "healthy"


def test_movies():
    client = app.test_client()
    response = client.get("/api/movies")

    assert response.status_code == 200
    assert len(response.json) == 4


def test_search():
    client = app.test_client()
    response = client.get("/api/movies?search=inception")

    assert response.status_code == 200
    assert response.json[0]["title"] == "Inception"
