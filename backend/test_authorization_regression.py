"""Security regression tests for the Aurevia authorization and license fixes.

Each test pins a specific behaviour that previously failed open:

* /fhir/Patient/import had no authentication dependency and provisioned a user
  with the fixed password "temporary_fhir_pass_123".
* LICENSE_SIGNING_SECRET silently fell back to a committed constant, and an
  unset LICENSE_KEY became the bundled enterprise trial key.
"""

import ast
import inspect
import os
import sys

import pytest

BACKEND = os.path.join(os.path.dirname(os.path.abspath(__file__)))
REPO_ROOT = os.path.dirname(BACKEND)

# `auth` and `licensing` use relative imports (`from . import database`), so they
# must be imported as parts of the `backend` package, not as top-level modules.
for candidate in (REPO_ROOT, os.path.dirname(REPO_ROOT)):
    if candidate not in sys.path:
        sys.path.insert(0, candidate)

# backend.auth refuses to import without SECRET_KEY (correctly fail-closed), and
# a test run is exactly the case it exempts, so set TESTING before importing.
os.environ.setdefault("SECRET_KEY", "test_secret_key_for_local_tests_only")
os.environ.setdefault("TESTING", "1")


def _import_backend_module(name):
    import importlib

    try:
        return importlib.import_module(f"backend.{name}")
    except ImportError:
        return importlib.import_module(name)


def _read(rel):
    with open(os.path.join(BACKEND, rel), encoding="utf-8") as fh:
        return fh.read()


# --------------------------------------------------------------------------
# FHIR patient import
# --------------------------------------------------------------------------
class TestFhirPatientImportIsAuthorized:
    def test_import_endpoint_requires_a_token(self):
        """The import route must depend on validate_fhir_token."""
        tree = ast.parse(_read("fhir_endpoints.py"))
        found = None
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for dec in node.decorator_list:
                if not isinstance(dec, ast.Call) or not isinstance(dec.func, ast.Attribute):
                    continue
                if dec.func.attr != "post":
                    continue
                path = dec.args[0].value if dec.args and isinstance(dec.args[0], ast.Constant) else ""
                if "Patient/import" in str(path):
                    found = node
        assert found is not None, "import_fhir_patient route not found"
        params = {a.arg for a in found.args.args}
        assert "token_data" in params, "import endpoint does not take a token"
        assert "validate_fhir_token" in ast.dump(found), (
            "import endpoint is not wired to validate_fhir_token"
        )

    def test_import_rejects_non_clinician_roles(self):
        source = _read("fhir_endpoints.py")
        assert "Only a clinician or admin may import FHIR patients." in source
        assert 'role not in ("doctor", "admin", "clinician")' in source

    def test_fixed_temporary_password_is_gone(self):
        """A shared constant password must never appear again."""
        source = _read("fhir_endpoints.py")
        assert "temporary_fhir_pass" not in source

    def test_import_uses_an_unguessable_password(self):
        source = _read("fhir_endpoints.py")
        assert "secrets.token_urlsafe(32)" in source


# --------------------------------------------------------------------------
# Licensing
# --------------------------------------------------------------------------
class TestLicensingFailsClosed:
    def test_missing_secret_raises_outside_testing(self, monkeypatch):
        licensing = _import_backend_module("licensing")

        monkeypatch.delenv("LICENSE_SIGNING_SECRET", raising=False)
        monkeypatch.delenv("TESTING", raising=False)
        with pytest.raises(RuntimeError, match="LICENSE_SIGNING_SECRET"):
            licensing._load_license_secret()

    def test_configured_secret_is_used(self, monkeypatch):
        licensing = _import_backend_module("licensing")

        monkeypatch.setenv("LICENSE_SIGNING_SECRET", "a-real-secret")
        monkeypatch.delenv("TESTING", raising=False)
        assert licensing._load_license_secret() == "a-real-secret"

    def test_testing_mode_may_use_the_default(self, monkeypatch):
        licensing = _import_backend_module("licensing")

        monkeypatch.delenv("LICENSE_SIGNING_SECRET", raising=False)
        monkeypatch.setenv("TESTING", "1")
        assert licensing._load_license_secret() == licensing._DEFAULT_LICENSE_SECRET

    def test_is_testing_accepts_common_truthy_spellings(self, monkeypatch):
        licensing = _import_backend_module("licensing")

        for value in ("1", "true", "TRUE", "yes", "on"):
            monkeypatch.setenv("TESTING", value)
            assert licensing._is_testing() is True, value
        for value in ("", "0", "false", "no"):
            monkeypatch.setenv("TESTING", value)
            assert licensing._is_testing() is False, value

    def test_unset_license_key_is_not_a_trial_license(self, monkeypatch):
        licensing = _import_backend_module("licensing")

        monkeypatch.delenv("LICENSE_KEY", raising=False)
        monkeypatch.setenv("TESTING", "1")
        assert licensing.get_active_license_tier() == "none"
        assert licensing.get_active_license_modules() == []

    def test_known_trial_key_rejected_outside_testing(self, monkeypatch):
        licensing = _import_backend_module("licensing")

        monkeypatch.delenv("TESTING", raising=False)
        valid, _reason = licensing.verify_license_key("CLINIC-TRIAL-2026")
        assert valid is False, "a published trial key must not validate in production"

    def test_known_trial_key_accepted_in_testing(self, monkeypatch):
        licensing = _import_backend_module("licensing")

        monkeypatch.setenv("TESTING", "1")
        valid, _reason = licensing.verify_license_key("CLINIC-TRIAL-2026")
        assert valid is True


# --------------------------------------------------------------------------
# Shared role guard
# --------------------------------------------------------------------------
class TestRoleGuard:
    def test_require_roles_builds_a_dependency(self):
        auth = _import_backend_module("auth")

        guard = auth.require_roles("admin")
        assert callable(guard)

        class FakeUser:
            role = "admin"

        assert guard(FakeUser()).role == "admin"

    def test_require_roles_rejects_wrong_role(self):
        auth = _import_backend_module("auth")
        from fastapi import HTTPException

        guard = auth.require_roles("admin")

        class FakeUser:
            role = "patient"

        with pytest.raises(HTTPException) as exc:
            guard(FakeUser())
        assert exc.value.status_code == 403

    def test_guard_is_case_insensitive(self):
        auth = _import_backend_module("auth")

        guard = auth.require_roles("admin")

        class FakeUser:
            role = "ADMIN"

        assert guard(FakeUser()) is not None


# --------------------------------------------------------------------------
# Router-level protection of the data / clinical planes
# --------------------------------------------------------------------------
PROTECTED_ROUTERS = {
    "routes/data_platform_routes.py": "require_admin",
    "routes/mesh_routes.py": "require_admin",
    "routes/data_engineering_routes.py": "require_admin",
    "routes/recommendation_routes.py": "require_clinician_or_admin",
    "routes/peak_healthcare_routes.py": "require_clinician_or_admin",
    "fhir_compression.py": "require_clinician_or_admin",
    "i18n_audio.py": "require_clinician_or_admin",
}


@pytest.mark.parametrize("rel,guard", sorted(PROTECTED_ROUTERS.items()))
def test_router_requires_authentication(rel, guard):
    source = _read(rel)
    tree = ast.parse(source)

    deps = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "router" \
                        and isinstance(node.value, ast.Call):
                    for kw in node.value.keywords:
                        if kw.arg == "dependencies":
                            deps.add(ast.dump(kw.value))

    assert deps, f"{rel}: router declares no dependencies"
    assert any(guard in d for d in deps), f"{rel}: router does not require {guard}"