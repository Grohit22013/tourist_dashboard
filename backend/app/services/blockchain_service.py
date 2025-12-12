# app/services/blockchain_service.py
import os
import json
import time
import logging
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

from web3 import Web3
from web3.exceptions import ContractLogicError

logger = logging.getLogger(__name__)
logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

# ===== Blockchain / contract setup =====
# prefer GANACHE_URL env; fallback to common local url
GANACHE_URL = os.getenv("GANACHE_URL", "http://ganache:8545")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")  # optional: when present we sign txs locally

w3 = Web3(Web3.HTTPProvider(GANACHE_URL))

# wait for chain readiness (short loop)
for i in range(10):
    try:
        if w3.is_connected():
            logger.info("Connected to blockchain at %s", GANACHE_URL)
            break
    except Exception:
        pass
    logger.info("Waiting for blockchain... attempt %d", i + 1)
    time.sleep(1)
else:
    raise RuntimeError("Cannot connect to blockchain at %s" % GANACHE_URL)

# account setup
if PRIVATE_KEY:
    account = w3.eth.account.from_key(PRIVATE_KEY)
    SENDER_ADDRESS = account.address
else:
    # use first funded unlocked account from provider (Ganache)
    funded = [a for a in w3.eth.accounts if w3.eth.get_balance(a) > 0]
    if not funded:
        raise RuntimeError("No funded accounts available on the node")
    SENDER_ADDRESS = funded[0]
    account = None

# Load contract ABI & address (Truffle build format)
# try several likely paths (service located at app/services)
BASE_DIR = Path(__file__).resolve().parent
possible_paths = [
    BASE_DIR / "contracts" / "build" / "contracts" / "TouristRegistry.json",
    BASE_DIR.parents[1] / "build" / "contracts" / "TouristRegistry.json",
    BASE_DIR / "contracts" / "TouristRegistry.json",
    Path(os.getenv("CONTRACT_ABI_PATH", "")) if os.getenv("CONTRACT_ABI_PATH") else None,
]

contract_data = None
for p in [pp for pp in possible_paths if pp]:
    try:
        p = Path(p)
        if p.exists():
            with open(p, "r") as f:
                raw = f.read().strip()
                if raw:
                    contract_data = json.loads(raw)
                    logger.info("Loaded contract JSON from %s", p)
                    break
    except Exception:
        logger.exception("Failed to load contract JSON from %s", p)

if not contract_data:
    logger.warning("Contract JSON not found in build artifact; relying on env-provided ABI if present")
    # try raw ABI in env
    abi_env = os.getenv("CONTRACT_ABI_JSON")
    if abi_env:
        try:
            contract_data = {"abi": json.loads(abi_env)}
            logger.info("Loaded contract ABI from CONTRACT_ABI_JSON env")
        except Exception:
            logger.exception("Failed to parse CONTRACT_ABI_JSON")

if not contract_data:
    raise RuntimeError("Contract ABI JSON not found. Provide build artifact or set CONTRACT_ABI_PATH/CONTRACT_ABI_JSON")

contract_abi = contract_data.get("abi")
networks = contract_data.get("networks", {}) or {}

if not contract_abi:
    raise RuntimeError("Contract ABI missing in contract JSON")

contract_address = None
# try networks block (Truffle)
if networks:
    for netid, info in networks.items():
        addr = info.get("address")
        if addr:
            contract_address = addr
            break

# allow override via env
contract_address = os.getenv("TOURIST_REGISTRY_ADDRESS", contract_address)
if not contract_address:
    raise RuntimeError("Contract address not found in build artifact or TOURIST_REGISTRY_ADDRESS not set")

logger.info("Using contract at %s", contract_address)
contract_instance = w3.eth.contract(address=Web3.to_checksum_address(contract_address), abi=contract_abi)

# ===== Helpers =====
def _normalize_date_field(v: Any) -> str:
    """Return YYYY-MM-DD string for date-like input."""
    if v is None:
        return ""
    if hasattr(v, "strftime"):
        return v.strftime("%Y-%m-%d")
    s = str(v)
    if "T" in s:
        s = s.split("T", 1)[0]
    if " " in s:
        s = s.split(" ", 1)[0]
    return s

def _ensure_sender_nonce() -> int:
    return w3.eth.get_transaction_count(SENDER_ADDRESS)

def _build_and_send_tx(tx_dict: Dict[str, Any]) -> str:
    """
    Signs (if PRIVATE_KEY) or sends a transaction and returns receipt tx hash hex.
    DEV HELP: if local Ganache has automine disabled, call evm_mine to force mining.
    """
    try:
        if account:  # sign locally
            signed = w3.eth.account.sign_transaction(tx_dict, private_key=PRIVATE_KEY)
            raw = getattr(signed, "raw_transaction", None) or getattr(signed, "rawTransaction", None)
            if raw is None:
                logger.error("Signed transaction object missing raw bytes: attrs=%s", dir(signed))
                raise RuntimeError("Signed transaction has no raw bytes")
            tx_hash = w3.eth.send_raw_transaction(raw)
        else:
            tx_hash = w3.eth.send_transaction(tx_dict)

        # ==== DEV: force a mine on local nodes so wait_for_transaction_receipt returns promptly ====
        try:
            # safe: only available on local dev nodes like Ganache / Hardhat
            w3.provider.make_request("evm_mine", [])
        except Exception:
            # ignore if method not available (public/test networks)
            logger.debug("evm_mine not available or failed; continuing to wait for receipt")

        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        return receipt.transactionHash.hex()
    except Exception as e:
        logger.exception("Failed to build/send tx: %s", e)
        raise


def _subject_to_bytes32(subject_id: str) -> bytes:
    """
    Convert subject identifier to keccak bytes32 as contract expects.
    Accepts DID, phone, or any string — caller should avoid sending raw PII if possible.
    """
    return w3.keccak(text=str(subject_id))

def _pack_attestation_return(raw_tuple: Tuple) -> Dict[str, Any]:
    """
    Convert raw ABI tuple to friendly dict: (cid, timestamp, issuer, meta) or adapt as needed.
    """
    # many contract functions return (string, uint256, address, string)
    cid = raw_tuple[0] if len(raw_tuple) > 0 else ""
    timestamp = int(raw_tuple[1]) if len(raw_tuple) > 1 else 0
    issuer = Web3.to_checksum_address(raw_tuple[2]) if len(raw_tuple) > 2 and raw_tuple[2] else ""
    meta = raw_tuple[3] if len(raw_tuple) > 3 else ""
    return {"cid": cid, "timestamp": timestamp, "issuer": issuer, "meta": meta}

# ===== Public functions =====

def register_tourist_on_chain(data: dict) -> str:
    """
    Register a tourist on-chain via the contract's registerTourist method.
    Accepts flexible keys and normalizes them.
    Returns transaction hash hex string.
    """
    full_name = data.get("full_name") or data.get("fullName") or ""
    kyc_id = data.get("kyc_id") or data.get("kycId") or ""
    visit_start = data.get("visitStart") or data.get("visit_start") or ""
    visit_end = data.get("visitEnd") or data.get("visit_end") or ""

    visit_start_str = _normalize_date_field(visit_start)
    visit_end_str = _normalize_date_field(visit_end)

    emergency = data.get("emergencyPhone") \
                or data.get("emergency_phone") \
                or data.get("emergency_contacts") \
                or data.get("emergencyContacts") \
                or []
    if isinstance(emergency, list):
        emergency_json = json.dumps(emergency)
    elif isinstance(emergency, dict):
        emergency_json = json.dumps([emergency])
    else:
        emergency_json = json.dumps([emergency]) if emergency else json.dumps([])

    tx = contract_instance.functions.registerTourist(
        full_name,
        kyc_id,
        visit_start_str,
        visit_end_str,
        emergency_json
    ).build_transaction({
        "from": SENDER_ADDRESS,
        "nonce": _ensure_sender_nonce(),
        "gas": 500_000,
        "gasPrice": w3.to_wei("20", "gwei"),
    })

    try:
        tx_hash = _build_and_send_tx(tx)
        logger.info("register_tourist_on_chain tx_hash=%s", tx_hash)
        return tx_hash
    except ContractLogicError as e:
        logger.error("Contract logic error during register_tourist_on_chain: %s", e)
        raise
    except Exception as e:
        logger.exception("Failed to send register_tourist_on_chain transaction: %s", e)
        raise

def register_kyc_attestation_on_chain(subject_id: str, ipfs_cid: str, metadata: Optional[Dict[str, Any]] = None) -> Optional[str]:
    """
    Anchor a privacy-preserving attestation on-chain.
    Uses keccak(subject_id) -> bytes32, calls contract.anchorKyc(subjectHash, cid, meta)
    Returns tx hash or None on failure.
    """
    if not subject_id or not ipfs_cid:
        raise ValueError("subject_id and ipfs_cid are required")

    subject_hash_bytes = _subject_to_bytes32(subject_id)
    meta_json = json.dumps(metadata or {}) if metadata else ""

    # try to call anchorKyc(subjectHash, cid, meta)
    fn = None
    try:
        if hasattr(contract_instance.functions, "anchorKyc"):
            fn = contract_instance.functions.anchorKyc(subject_hash_bytes, ipfs_cid, meta_json)
        elif hasattr(contract_instance.functions, "attestKyc"):
            # older contract naming
            fn = contract_instance.functions.attestKyc(subject_hash_bytes, ipfs_cid)
    except Exception:
        fn = None

    if fn is None:
        logger.info("Contract does not expose an attestation function; skipping on-chain attestation")
        return None

    tx = fn.build_transaction({
        "from": SENDER_ADDRESS,
        "nonce": _ensure_sender_nonce(),
        "gas": 500_000,
        "gasPrice": w3.to_wei("20", "gwei"),
    })

    try:
        tx_hash = _build_and_send_tx(tx)
        logger.info("register_kyc_attestation_on_chain tx_hash=%s subject_hash=%s cid=%s",
                    tx_hash, subject_hash_bytes.hex(), ipfs_cid)
        return tx_hash
    except Exception:
        logger.exception("Failed to anchor KYC on-chain")
        return None

def get_tourist(tourist_address: str) -> dict:
    """
    Fetch tourist by wallet address using contract.getTourist(address).
    Returns friendly dict or {'error':...}.
    """
    try:
        addr = Web3.to_checksum_address(tourist_address)
        result = contract_instance.functions.getTourist(addr).call()
        if not result or not result[0]:
            return {"error": "No tourist found for this address"}
        emergency_contacts_raw = result[4] if result[4] else "[]"
        try:
            emergency_contacts = json.loads(emergency_contacts_raw)
        except Exception:
            emergency_contacts = [emergency_contacts_raw]
        return {
            "full_name": result[0],
            "kyc_id": result[1],
            "visit_start": result[2],
            "visit_end": result[3],
            "emergency_contacts": emergency_contacts
        }
    except Exception as e:
        logger.exception("get_tourist failed: %s", e)
        return {"error": str(e)}

# ---- Attestation reader helpers ----
def attestation_count(subject_id: str) -> int:
    """
    Returns number of attestations for subject hash (int).
    """
    try:
        subj = _subject_to_bytes32(subject_id)
        cnt = contract_instance.functions.attestationCount(subj).call()
        return int(cnt)
    except Exception:
        logger.exception("attestation_count failed for %s", subject_id)
        raise

def get_attestation_by_index(subject_id: str, index: int) -> Dict[str, Any]:
    """
    Get attestation by index. Requires VERIFIER role on contract side if function enforces role.
    Returns dict {cid, timestamp, issuer, meta}.
    """
    try:
        subj = _subject_to_bytes32(subject_id)
        raw = contract_instance.functions.getAttestationByIndex(subj, int(index)).call()
        return _pack_attestation_return(raw)
    except ContractLogicError as e:
        logger.error("Contract logic error while fetching attestation: %s", e)
        raise
    except Exception:
        logger.exception("get_attestation_by_index failed for %s idx=%d", subject_id, index)
        raise

def get_latest_attestation(subject_id: str) -> Dict[str, Any]:
    """
    Fetch the latest attestation for a subject. Requires EMERGENCY_ROLE on-chain if function enforces role.
    Returns dict {cid, timestamp, issuer, meta}.
    """
    try:
        subj = _subject_to_bytes32(subject_id)
        raw = contract_instance.functions.getLatestAttestation(subj).call()
        return _pack_attestation_return(raw)
    except ContractLogicError as e:
        logger.error("Contract logic error while fetching latest attestation: %s", e)
        raise
    except Exception:
        logger.exception("get_latest_attestation failed for %s", subject_id)
        raise
