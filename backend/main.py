from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Body, Request
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connected websocket clients
connected_clients = set()


# ----------------------- BROADCAST FUNCTION -----------------------
async def broadcast(message: dict):
    """Send data to all active WebSocket clients."""
    dead_clients = []
    

    for client in connected_clients:
        try:
            await client.send_text(json.dumps(message))
        except Exception:
            dead_clients.append(client)

    # Remove closed/broken clients
    for dc in dead_clients:
        connected_clients.remove(dc)

    print(f"Broadcasted to {len(connected_clients)} clients")


# ----------------------- HEALTH CHECK -----------------------
@app.get("/health")
async def health_check():
    return {"status": "ok", "clients": len(connected_clients)}


# ----------------------- HTTP ROUTE -----------------------
@app.post("/send-sos")
async def send_sos(request: Request):
    """
    Accept ANY JSON body.
    Whatever body is received → broadcast to all WebSocket clients.
    """
    body = await request.json()   
    print("Received POST data:", body)

    # Broadcast full body as-is
    await broadcast(body)

    return {
        "status": "sent",
        "sent_data": body,
        "clients": len(connected_clients),
    }


@app.post("/resqr-pos")
async def send_sos(request: Request):
    """
    Accept ANY JSON body.
    Whatever body is received → broadcast to all WebSocket clients.
    """
    body = await request.json()      # Accept ANY JSON payload
    print("Received POST data:", body)

    # Broadcast full body as-is
    await broadcast(body)

    return {
        "status": "sent",
        "sent_data": body,
        "clients": len(connected_clients),
    }

# ----------------------- WEBSOCKET ROUTE -----------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Client connected!")
    connected_clients.add(websocket)

    try:
        while True:
            msg = await websocket.receive_text()
            print("Received WS:", msg)

    except WebSocketDisconnect:
        print("Client disconnected")
        connected_clients.remove(websocket)
