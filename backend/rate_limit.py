"""Shared rate limiter.

Lives in its own module so that both `backend.main` and `backend.auth` can
import it. It previously lived in `backend.main`, which meant `backend.auth`
had to import `backend.main`; because `main` imports every router module, any
router that also imported `auth` produced a circular import.
"""

import os

from slowapi import Limiter
from slowapi.util import get_remote_address


def _is_testing() -> bool:
    return os.getenv("TESTING", "").strip().lower() in {"1", "true", "yes", "on"}


# One limiter instance shared by every component that decorates a route.
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
if _is_testing():
    limiter.enabled = False