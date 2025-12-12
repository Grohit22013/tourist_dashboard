# backend/app/auth.py
"""
Simple auth dependency for FastAPI (development-friendly).

- Exports `get_current_user` dependency used by routes to obtain caller identity.
- Exports `require_role(role)` helper for quick role checks.
- Dev conveniences:
  - set SKIP_AUTH_DEV=true to bypass auth (returns admin user) — DO NOT USE IN PROD
  - use Authorization: Bearer <token> with tokens in DEV_TOKEN_MAP to simulate different roles

Replace the placeholder JWT verification block with real verification (JWKS / Auth0 / Keycloak / Firebase) in production.
"""

from typing import Optional, Dict, Any
import os
import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

bearer = HTTPBearer(auto_error=False)

# Development tokens (convenience). Map tokens -> user dicts.
# Example token strings for local testing: "dev-admin-token", "dev-verifier-token", "dev-user-+919876543210"
DEV_TOKEN_MAP: Dict[str, Dict[str, Any]] = {
    "dev-admin-token": {"sub": "dev-admin", "role": "admin", "phone": None},
    "dev-verifier-token": {"sub": "dev-verifier", "role": "verifier", "phone": None},
    # simulate a specific phone-bound user:
    "dev-user-+919876543210": {"sub": "+919876543210", "role": "user", "phone": "+919876543210"},
}


def _unauthorized(detail: str = "Not authenticated"):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail, headers={"WWW-Authenticate": "Bearer"})


def _forbidden(detail: str = "Forbidden"):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> Dict[str, Any]:
    """
    Resolve and return the current user as a dict.

    Behavior:
      - If SKIP_AUTH_DEV=true -> returns dev-system admin user (development only).
      - If Authorization header present and token in DEV_TOKEN_MAP -> returns the mapped user (development).
      - Otherwise returns 401. Replace the production section below with real JWT verification.

    Returned user dict structure (example):
      {"sub": "<subject>", "role": "admin"|"verifier"|"user", "phone": "<phone or None>"}
    """
    # Dev bypass for local testing
    if os.getenv("SKIP_AUTH_DEV", "false").lower() in ("1", "true", "yes"):
        logger.warning("SKIP_AUTH_DEV is enabled; skipping auth (DEV ONLY).")
        return {"sub": "dev-system", "role": "admin", "phone": None}

    # No auth header provided
    if credentials is None:
        _unauthorized("Missing Authorization header")

    token = credentials.credentials

    # Dev token mapping
    if token in DEV_TOKEN_MAP:
        return DEV_TOKEN_MAP[token]

    # ----------- PRODUCTION: validate JWT here -----------
    # Example (pseudocode — replace with actual libs/logic):
    # try:
    #     payload = jwt_decode(token, key=PUBLIC_KEY, algorithms=["RS256"], audience=EXPECTED_AUD)
    #     return {"sub": payload["sub"], "role": payload.get("role","user"), "phone": payload.get("phone")}
    # except ExpiredSignatureError:
    #     _unauthorized("Token expired")
    # except Exception:
    #     _unauthorized("Invalid token")
    #
    # If you integrate with Auth0/Keycloak/Firebase, implement verification above and return a consistent user dict.
    # ----------------------------------------------------

    _unauthorized("Invalid or unrecognized token. Use a dev token or enable SKIP_AUTH_DEV in development.")


def require_role(role: str):
    """
    Dependency factory: returns a dependency that checks current user's role.
    Usage:
        @router.post("/admin-only", dependencies=[Depends(require_role("admin"))])
        async def admin_endpoint(user = Depends(get_current_user)):
            ...
    """
    async def _dep(user: Dict[str, Any] = Depends(get_current_user)):
        if not user:
            _unauthorized()
        if user.get("role") != role:
            _forbidden(f"Requires role '{role}'")
        return user
    return _dep
