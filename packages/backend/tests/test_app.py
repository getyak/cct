import httpx
import pytest

from cct.config import settings
from cct.main import app


@pytest.mark.asyncio
async def test_healthz(tmp_path):
    settings["storage"]["data_dir"] = str(tmp_path)
    transport = httpx.ASGITransport(app=app)

    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
