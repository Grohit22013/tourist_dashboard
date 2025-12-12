

# check_node.py
from web3 import Web3
import os
GANACHE = os.getenv("GANACHE_URL", "http://127.0.0.1:8545")
w3 = Web3(Web3.HTTPProvider(GANACHE))
print("GANACHE_URL:", GANACHE)
print("connected:", w3.is_connected())
try:
    print("clientVersion:", w3.clientVersion)
except Exception:
    pass
try:
    accts = w3.eth.accounts
    print("accounts:", accts)
    for a in accts:
        print(a, "balance:", w3.eth.get_balance(a))
except Exception as e:
    print("error listing accounts:", e)

# optionally try a small call to node to get blockNumber
try:
    print("blockNumber:", w3.eth.block_number)
except Exception as e:
    print("error getting block number:", e)
