# app/services/digital_id_service.py

from __future__ import annotations

import datetime
import logging
import hashlib
import base58
from typing import Any, Dict

from app.services.blockchain_service import register_tourist_on_chain

logger = logging.getLogger(__name__)


def _shorten_tx_hash(tx_hash: str) -> str:
    """
    Convert long Ethereum tx_hash -> short Base58 code (12 chars).
    Example:
        0xabc123... -> "7Xc3ZdFhG5Q1"
    """
    clean_hash = tx_hash.lower().replace("0x", "")
    digest = hashlib.sha256(clean_hash.encode()).digest()
    short_b58 = base58.b58encode(digest)[:12].decode("utf-8")
    return short_b58


def issue_digital_id(phone: str) -> str:
    """
    Issue a blockchain-backed short digital ID for a user.

    Flow:
      1. Build a minimal payload.
      2. Register on blockchain via register_tourist_on_chain().
      3. Convert tx hash -> short Base58 ID.
      4. If blockchain fails, raise exception (no fallback).
    """
    if not phone:
        raise ValueError("phone is required for ID issuance")

    payload: Dict[str, Any] = {
        "phone": str(phone),
        "issued_at": datetime.datetime.utcnow().isoformat(),
        "purpose": "digital_id_issuance",
    }

    try:
        tx_hash = register_tourist_on_chain(payload)
        if not tx_hash:
            raise RuntimeError("Blockchain did not return a tx hash")

        short_id = _shorten_tx_hash(tx_hash)
        logger.info("✅ Blockchain ID issued for %s: %s (tx=%s)", phone, short_id, tx_hash)
        return short_id

    except Exception as e:
        logger.exception("❌ Blockchain ID issuance failed for %s: %s", phone, e)
        # Explicitly signal failure to caller (route)
        raise RuntimeError("Blockchain issuance failed") from e
