import os

# Default: local host for when you run truffle migrate manually
GANACHE_URL = os.getenv("GANACHE_URL", "http://127.0.0.1:8545")

# Optional private key for signing txs (otherwise backend uses unlocked Ganache accounts)
PRIVATE_KEY = os.getenv("PRIVATE_KEY")

# Path to Truffle build artifacts
CONTRACTS_BUILD_PATH = os.getenv(
    "CONTRACTS_BUILD_PATH",
    os.path.join(os.path.dirname(__file__), "..", "build", "contracts")
)

# For KYC/IPFS
IPFS_API_URL = os.getenv("IPFS_API_URL", "http://127.0.0.1:5001/api/v0")
IPFS_PIN_SERVICE = os.getenv("IPFS_PIN_SERVICE")  # nft.storage or pinata API key
KYC_USE_KMS = os.getenv("KYC_USE_KMS", "false").lower() == "true"
KYC_MASTER_KEY_BASE64 = os.getenv("KYC_MASTER_KEY_BASE64")

# DB
TOURIST_DATABASE_URL = os.getenv("TOURIST_DATABASE_URL", "sqlite:///./tourists.db")

# FCM
FCM_SERVER_KEY = os.getenv("FCM_SERVER_KEY")
