

# from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Body, Request
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# from typing import Dict, List
# import json

# app = FastAPI()

# # CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Connected websocket clients
# connected_clients = set()

# # ----------------------- INSTRUCTION QUEUE (for dongle) -----------------------
# # device_id -> list of pending messages (strings)
# instruction_queue: Dict[str, List[str]] = {}


# class InstructionIn(BaseModel):
#     device_id: str
#     message: str


# # ----------------------- BROADCAST FUNCTION -----------------------
# async def broadcast(message: dict):
#     """Send data to all active WebSocket clients."""
#     dead_clients = []

#     for client in connected_clients:
#         try:
#             await client.send_text(json.dumps(message))
#         except Exception:
#             dead_clients.append(client)

#     # Remove closed/broken clients
#     for dc in dead_clients:
#         connected_clients.remove(dc)

#     print(f"Broadcasted to {len(connected_clients)} clients")


# # ----------------------- HEALTH CHECK -----------------------
# @app.get("/health")
# async def health_check():
#     return {"status": "ok", "clients": len(connected_clients)}


# # ----------------------- HTTP ROUTE: SOS (uplink) -----------------------
# @app.post("/send-sos")
# async def send_sos(request: Request):
#     """
#     Accept ANY JSON body.
#     Whatever body is received → broadcast to all WebSocket clients.
#     """
#     body = await request.json()
#     print("Received POST data:", body)

#     # Broadcast full body as-is
#     await broadcast(body)

#     return {
#       "status": "sent",
#       "sent_data": body,
#       "clients": len(connected_clients),
#     }


# # ----------------------- HTTP ROUTE: RESQR POS (you already had this) -----------------------
# @app.post("/resqr-pos")
# async def resqr_pos(request: Request):
#     """
#     Accept ANY JSON body.
#     Whatever body is received → broadcast to all WebSocket clients.
#     """
#     body = await request.json()      # Accept ANY JSON payload
#     print("Received POST data:", body)

#     # Broadcast full body as-is
#     await broadcast(body)

#     return {
#       "status": "sent",
#       "sent_data": body,
#       "clients": len(connected_clients),
#     }


# # ----------------------- NEW: RECEIVE INSTRUCTION (downlink enqueue) -----------------------
# @app.post("/receive-ins")
# async def receive_ins(data: InstructionIn):
#     """
#     Called by your app / control UI when you want to send a message
#     to a specific dongle (via LoRa gateway).

#     Example body:
#     {
#       "device_id": "NODE_01",
#       "message": "Rangers are on the way!"
#     }
#     """
#     q = instruction_queue.setdefault(data.device_id, [])
#     q.append(data.message)
#     print(f"[INS] Queued for {data.device_id}: {data.message}")

#     return {"status": "queued", "device_id": data.device_id, "message": data.message}


# # ----------------------- NEW: PULL INSTRUCTION (gateway polls) -----------------------
# @app.get("/pull-ins/{device_id}")
# async def pull_ins(device_id: str):
#     """
#     Polled by the LoRa gateway every few seconds.

#     If something is queued for this device_id, return the next message and remove it.
#     Response examples:

#     - If message exists:
#       { "has_ins": true, "message": "Rangers coming in 10 mins" }

#     - If nothing:
#       { "has_ins": false }
#     """
#     q = instruction_queue.get(device_id, [])

#     if q:
#       msg = q.pop(0)
#       print(f"[INS] Dequeued for {device_id}: {msg}")
#       return {"has_ins": True, "message": msg}

#     return {"has_ins": False}

# # ----------------------- WEBSOCKET ROUTE -----------------------
# @app.websocket("/ws")
# async def websocket_endpoint(websocket: WebSocket):
#     await websocket.accept()
#     print("Client connected!")
#     connected_clients.add(websocket)

#     try:
#         while True:
#             msg = await websocket.receive_text()
#             print("Received WS:", msg)

#     except WebSocketDisconnect:
#         print("Client disconnected")
#         connected_clients.remove(websocket)





from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List
import json

app = FastAPI()

# ----------------------- CORS -----------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------- GLOBALS -----------------------
connected_clients = set()        # All WS connections
instruction_queue: Dict[str, List[str]] = {}  # device_id => queue of messages


# ----------------------- MODELS -----------------------
class InstructionIn(BaseModel):
    device_id: str
    message: str


# ----------------------- BROADCAST -----------------------
async def broadcast(message: dict):
    """Send JSON message to all active WebSocket clients."""
    dead = []

    for client in connected_clients:
        try:
            await client.send_text(json.dumps(message))
        except Exception:
            dead.append(client)

    for dc in dead:
        connected_clients.remove(dc)

    print(f"[WS] Broadcast to {len(connected_clients)} clients.")


# ----------------------- HEALTH CHECK -----------------------
@app.get("/health")
async def health_check():
    return {"status": "ok", "connected_ws": len(connected_clients)}


# ----------------------- SOS BROADCAST (HTTP → WS) -----------------------
@app.post("/send-sos")
async def send_sos(request: Request):
    body = await request.json()
    print("[POST] SOS:", body)

    await broadcast(body)

    return {"status": "sent", "data": body}


# ----------------------- POSITION BROADCAST -----------------------
@app.post("/resqr-pos")
async def resqr_pos(request: Request):
    body = await request.json()
    print("[POST] Position:", body)

    await broadcast(body)

    return {"status": "sent", "data": body}


# ----------------------- RECEIVE INSTRUCTION (UI → Back-end) -----------------------
@app.post("/receive-ins")
async def receive_instruction(data: InstructionIn):
    queue = instruction_queue.setdefault(data.device_id, [])
    queue.append(data.message)

    print(f"[INS] Added → {data.device_id}: {data.message}")

    return {"status": "queued", "device_id": data.device_id, "message": data.message}


# ----------------------- PULL INSTRUCTION (Gateway polls) -----------------------
@app.get("/pull-ins/{device_id}")
async def pull_instruction(device_id: str):
    q = instruction_queue.get(device_id, [])

    if q:
        msg = q.pop(0)
        print(f"[INS] Sent → {device_id}: {msg}")
        return {"has_ins": True, "message": msg}

    return {"has_ins": False}


# ----------------------- WEBSOCKET -----------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)

    print("[WS] Client connected.")

    try:
        while True:
            msg = await websocket.receive_text()
            # print(msg)
            msj=json.loads(msg)
            # print(msj)

            queue = instruction_queue.setdefault(msj.get('device_id'), [])
            queue.append(msj.get('message'))
            print("[WS] Received from client:", msg)

    except WebSocketDisconnect:
        connected_clients.remove(websocket)
        print("[WS] Client disconnected.")
