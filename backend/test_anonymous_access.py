"""Live HTTP checks: anonymous callers must be denied on protected routes.

These drive the real ASGI app through TestClient rather than inspecting source,
so they fail if a guard is wired up incorrectly or removed.
"""

import os
import sys

import pytest

BACKEND = os.path.join(os.path.dirname(os.path.abspath(__file__)))
REPO_ROOT = os.path.dirname(BACKEND)
for candidate in (REPO_ROOT, os.path.dirname(REPO_ROOT)):
    if candidate not in sys.path:
        sys.path.insert(0, candidate)

os.environ.setdefault("SECRET_KEY", "test_secret_key_for_local_tests_only")
os.environ.setdefault("TESTING", "1")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_regression.db")


@pytest.fixture(scope="module")
def client():
    fastapi_testclient = pytest.importorskip("fastapi.testclient")
    import backend.main as main_module

    with fastapi_testclient.TestClient(main_module.app) as c:
        yield c


# Routes that must never answer an anonymous caller.
PROTECTED = [
    ("POST", "/v1/data-platform/sql/execute", {"sql": "SELECT 1"}),
    ("POST", "/v1/data-platform/bi/ask", {"question": "how many patients?"}),
    ("POST", "/v1/data-platform/spark/variant-shred", {"payload": {}}),
    ("POST", "/v1/data-platform/agents/route", {"goal": "triage"}),
    ("POST", "/v1/data-platform/agents/governed-execute", {"goal": "run"}),
    ("POST", "/v1/data-platform/agents/sepsis/evaluate", {"patient": {}}),
    ("POST", "/v1/data-platform/agents/prior-auth/process", {"case": {}}),
    ("POST", "/v1/lakehouse/omop/transform", {"dataset": {}}),
    ("POST", "/v1/lakehouse/delta/restore", {"version": 1}),
    ("POST", "/v1/lakehouse/delta/time-travel", {"timestamp": "2026-01-01"}),
    ("POST", "/v1/mesh/run", {"pipeline": "x"}),
    ("POST", "/v1/recommendations/generate", {"patient": {}}),
    ("POST", "/v1/recommendations/clinical-interventions", {"patient": {}}),
    ("POST", "/v1/digital-twin/simulate", {"scenario": {}}),
    ("POST", "/v1/pharmacogenomics/evaluate", {"patient": {}}),
    ("POST", "/v1/clinical-council/deliberate", {"case": {}}),
    ("POST", "/v1/fhir/Patient/import/abc123", {}),
    ("POST", "/v1/fhir/compact", {"payload": "x"}),
    ("POST", "/v1/fhir/decompress", {"payload": "x"}),
]


@pytest.mark.parametrize("method,path,body", PROTECTED)
def test_anonymous_caller_is_denied(client, method, path, body):
    response = client.request(method, path, json=body)
    assert response.status_code in (401, 403), (
        f"{method} {path} answered an anonymous caller with "
        f"{response.status_code}: {response.text[:200]}"
    )


# Routes that must stay reachable without a session.
PUBLIC_OK = [
    ("GET", "/healthz"),
    ("POST", "/api/v1/auth/token"),
    ("POST", "/api/v1/auth/signup"),
]


@pytest.mark.parametrize("method,path", PUBLIC_OK)
def test_public_route_still_reachable(client, method, path):
    response = client.request(method, path, json={} if method == "POST" else None)
    assert response.status_code != 403, (
        f"{method} {path} is now blocked for everyone: {response.text[:200]}"
    )