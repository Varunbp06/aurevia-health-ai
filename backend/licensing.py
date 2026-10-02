"""AI Healthcare System - Offline License Verification Module

Provides offline cryptographic validation of B2B clinic licensing keys (signed JWTs).
"""
import datetime
import logging
import os
from typing import Tuple

from jose import JWTError, jwt

logger = logging.getLogger(__name__)

# License signing secret: loaded from environment for production security.
# Falls back to a default only in TESTING mode.
_DEFAULT_LICENSE_SECRET = "ai-healthcare-system-license-signature-validation-key-2026"


def _is_testing() -> bool:
    """True only when the process is explicitly running its own test suite."""
    return str(os.getenv("TESTING", "")).strip().lower() in ("1", "true", "yes", "on")


def _load_license_secret() -> str:
    """Resolve the license signing secret.

    The secret used to be a committed constant that production silently fell
    back to, which let anyone forge an enterprise license JWT offline. Outside
    an explicit test run a missing secret is now a hard startup failure, so a
    misconfigured deployment cannot serve forged licenses.
    """
    env_secret = os.getenv("LICENSE_SIGNING_SECRET")
    if env_secret:
        return env_secret
    if _is_testing():
        return _DEFAULT_LICENSE_SECRET
    raise RuntimeError(
        "LICENSE_SIGNING_SECRET must be set outside of testing. Generate one "
        "with: python -c \"import secrets; print(secrets.token_urlsafe(48))\". "
        "Refusing to start with a publicly known signing secret, which would "
        "allow forged license keys."
    )


LICENSE_SECRET = _load_license_secret()
ALGORITHM = "HS256"

# Permitted trial keys for easy out-of-the-box local testing
TRIAL_KEYS = {
    "CLINIC-TRIAL-2026": {
        "holder": "Trial Clinic",
        "tier": "enterprise",
        "expires_at": "2030-12-31"
    }
}


def verify_license_key(license_key: str) -> Tuple[bool, str]:
    """Verify the validity of a license key.

    Returns:
        (is_valid: bool, reason_or_holder: str)
    """
    # 1. Check for local trial keys first. The bundled key is a published
    #    constant, so it only confers a tier in an explicit test/local run;
    #    in production it must be signed like any other license.
    if license_key in TRIAL_KEYS and _is_testing():
        details = TRIAL_KEYS[license_key]
        expiry = datetime.datetime.fromisoformat(details["expires_at"])
        if datetime.datetime.now() > expiry:
            return False, f"Trial key expired on {details['expires_at']}"
        return True, f"Valid Trial License (Holder: {details['holder']})"

    # 2. Decode and verify cryptographic license key (JWT)
    try:
        payload = jwt.decode(license_key, LICENSE_SECRET, algorithms=[ALGORITHM], options={"verify_exp": False})

        # Verify expiration
        exp_timestamp = payload.get("exp")
        is_perpetual = payload.get("perpetual", False)
        if exp_timestamp and not is_perpetual:
            exp_date = datetime.datetime.fromtimestamp(exp_timestamp, tz=datetime.timezone.utc)
            if datetime.datetime.now(datetime.timezone.utc) > exp_date:
                return False, f"License expired on {exp_date.isoformat()}"

        holder = payload.get("holder", "Unknown Clinic")
        tier = payload.get("tier", "community")

        return True, f"Valid {tier.capitalize()} License (Holder: {holder})"
    except JWTError as e:
        logger.error("Cryptographic license verification failed: %s", str(e))
        return False, "Cryptographic signature validation failed"


def generate_license_key(holder: str, tier: str, days_valid: int, perpetual: bool = False, modules: list = None) -> str:
    """Utility to generate a signed license key for a customer.

    Can be run in python interactive shell to provision keys.
    """
    expiry = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=days_valid)
    payload = {
        "holder": holder,
        "tier": tier,
        "exp": int(expiry.timestamp()),
        "perpetual": perpetual,
        "modules": modules if modules is not None else ["*"]
    }
    return jwt.encode(payload, LICENSE_SECRET, algorithm=ALGORITHM)


def get_active_license_tier() -> str:
    """Retrieve the tier of the currently configured license key.

    Returns 'none' if no valid license key is configured.
    """
    import os
    license_key = (os.getenv("LICENSE_KEY") or "").strip()
    # An unset LICENSE_KEY used to be treated as the bundled enterprise trial
    # key, so an unconfigured production deployment reported enterprise tier.
    if not license_key:
        return "none"

    if license_key in TRIAL_KEYS:
        details = TRIAL_KEYS[license_key]
        try:
            expiry = datetime.datetime.fromisoformat(details["expires_at"])
            if datetime.datetime.now() > expiry:
                return "none"
            return details["tier"]
        except Exception:
            return "none"

    try:
        payload = jwt.decode(license_key, LICENSE_SECRET, algorithms=[ALGORITHM], options={"verify_exp": False})

        # Verify expiration
        exp_timestamp = payload.get("exp")
        is_perpetual = payload.get("perpetual", False)
        if exp_timestamp and not is_perpetual:
            exp_date = datetime.datetime.fromtimestamp(exp_timestamp, tz=datetime.timezone.utc)
            if datetime.datetime.now(datetime.timezone.utc) > exp_date:
                return "none"

        return payload.get("tier", "community")
    except JWTError:
        return "none"


def get_active_license_modules() -> list:
    """Retrieve the list of allowed modules from the active license key."""
    import os
    license_key = (os.getenv("LICENSE_KEY") or "").strip()
    if not license_key:
        return []

    if license_key in TRIAL_KEYS:
        return ["*"]

    try:
        payload = jwt.decode(license_key, LICENSE_SECRET, algorithms=[ALGORITHM], options={"verify_exp": False})

        # Verify expiration
        exp_timestamp = payload.get("exp")
        is_perpetual = payload.get("perpetual", False)
        if exp_timestamp and not is_perpetual:
            exp_date = datetime.datetime.fromtimestamp(exp_timestamp, tz=datetime.timezone.utc)
            if datetime.datetime.now(datetime.timezone.utc) > exp_date:
                return []

        return payload.get("modules", ["*"])
    except JWTError:
        return []


def enforce_license_tier(required_tier: str):
    """Dependency helper to enforce a minimum license tier for specific endpoints."""
    import os

    from fastapi import HTTPException

    def dependency():
        # During unit testing of general app paths, we can bypass general check if TESTING is active.
        if _is_testing():
            return

        tier = get_active_license_tier()
        if tier == "none":
            raise HTTPException(
                status_code=402,
                detail="License Key is missing or invalid. Please configure a valid LICENSE_KEY."
            )

        tier_hierarchy = {"trial": 0, "community": 1, "enterprise": 2}
        user_level = tier_hierarchy.get(tier, 0)
        required_level = tier_hierarchy.get(required_tier, 1)

        if user_level < required_level:
            raise HTTPException(
                status_code=402,
                detail=f"This premium feature requires a minimum license tier of '{required_tier}'. Your active tier is '{tier}'."
            )

    return dependency


def enforce_license_module(required_module: str, minimum_tier: str = "enterprise"):
    """Dependency helper to enforce that a specific module or minimum tier is licensed."""
    import os

    from fastapi import HTTPException

    def dependency():
        if _is_testing():
            return

        tier = get_active_license_tier()
        if tier == "none":
            raise HTTPException(
                status_code=402,
                detail="License Key is missing or invalid. Please configure a valid LICENSE_KEY."
            )

        # Check tier hierarchy first
        tier_hierarchy = {"trial": 0, "community": 1, "enterprise": 2}
        user_level = tier_hierarchy.get(tier, 0)
        required_level = tier_hierarchy.get(minimum_tier, 2)

        if user_level >= required_level:
            return

        # Fallback: check specific module access
        modules = get_active_license_modules()
        if "*" in modules or "all" in modules or required_module in modules:
            return

        raise HTTPException(
            status_code=402,
            detail=f"This premium feature requires either a minimum license tier of '{minimum_tier}' or a license for the module '{required_module}'."
        )

    return dependency
