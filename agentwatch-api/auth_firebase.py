"""Verify Firebase ID tokens for dashboard routes."""

from __future__ import annotations

import logging

import firebase_admin.auth as firebase_auth

logger = logging.getLogger(__name__)


def verify_firebase_id_token(id_token: str) -> dict | None:
    if not id_token or id_token.startswith("aw_"):
        return None
    try:
        return firebase_auth.verify_id_token(id_token)
    except Exception as e:
        logger.debug("invalid firebase token: %s", e)
        return None
