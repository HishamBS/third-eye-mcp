from fastapi.testclient import TestClient

from third_eye.api.server import app


def test_api_sharingan(monkeypatch, base_context):
    async def noop_async(*args, **kwargs):
        return None

    def noop(*args, **kwargs):
        return None

    monkeypatch.setattr("third_eye.api.server.ensure_models_available", noop_async)
    monkeypatch.setattr("third_eye.api.server.init_db", noop)
    monkeypatch.setattr("third_eye.api.server.shutdown_groq_client", noop_async)

    with TestClient(app) as client:
        response = client.post(
            "/eyes/sharingan/clarify",
            json={"context": base_context, "payload": {"prompt": "Need help", "lang": "en"}},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["tag"] == "[EYE/SHARINGAN]"


def test_api_overseer(monkeypatch, base_context):
    async def noop_async(*args, **kwargs):
        return None

    def noop(*args, **kwargs):
        return None

    monkeypatch.setattr("third_eye.api.server.ensure_models_available", noop_async)
    monkeypatch.setattr("third_eye.api.server.init_db", noop)
    monkeypatch.setattr("third_eye.api.server.shutdown_groq_client", noop_async)

    with TestClient(app) as client:
        response = client.post(
            "/eyes/overseer/navigator",
            json={"context": base_context, "payload": {"goal": "Ship release"}},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["tag"] == "[EYE/OVERSEER]"
        assert body["code"] == "OK_OVERSEER_GUIDE"
        assert "Overseer Navigator" in body["md"]
        assert body["next"] == "Start with sharingan/clarify to evaluate ambiguity."
        assert "schema_md" in body["data"]
