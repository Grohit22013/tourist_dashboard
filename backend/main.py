# # from fastapi import FastAPI, WebSocket, WebSocketDisconnect
# # from fastapi.middleware.cors import CORSMiddleware
# # import asyncio
# # import json

# # app = FastAPI()

# # app.add_middleware(
# #     CORSMiddleware,
# #     allow_origins=["*"],
# #     allow_credentials=True,
# #     allow_methods=["*"],
# #     allow_headers=["*"],
# # )

# # # Store connected clients
# # connected_clients = set()

# # async def send_periodic_alerts():
# #     """Broadcast SOS alert to all clients every 10 seconds."""
# #     while True:
# #         await asyncio.sleep(10)

# #         message = {
# #             "type": "SOS_ALERT",
# #             "name": "ROHIT",
# #             "phone": "+91 9841053223",
# #             "lat": 17.3616,
# #             "lng": 78.4747
# #         }

# #         # Broadcast to all clients
# #         for client in connected_clients.copy():
# #             try:
# #                 await client.send_text(json.dumps(message))
# #             except:
# #                 connected_clients.remove(client)

# #         print(f"Sent alert to {len(connected_clients)} clients")


# # @app.on_event("startup")
# # async def start_background_tasks():
# #     asyncio.create_task(send_periodic_alerts())


# # @app.websocket("/ws")
# # async def websocket_endpoint(websocket: WebSocket):
# #     await websocket.accept()
# #     print("Client connected!")

# #     connected_clients.add(websocket)

# #     try:
# #         while True:
# #             await websocket.receive_text()  # ignore messages
# #     except WebSocketDisconnect:
# #         print("Client disconnected")
# #         connected_clients.remove(websocket)


# from fastapi import FastAPI, WebSocket, WebSocketDisconnect
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi import Body
# import asyncio
# import json

# app = FastAPI()

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Store connected clients
# connected_clients = set()


# # ----------------------- BROADCAST FUNCTION -----------------------
# async def broadcast(message: dict):
#     """Send data to all connected WebSocket clients."""
#     dead_clients = []

#     for client in connected_clients:
#         try:
#             await client.send_text(json.dumps(message))
#         except:
#             dead_clients.append(client)

#     for dc in dead_clients:
#         connected_clients.remove(dc)

#     print(f"Broadcasted to {len(connected_clients)} clients")
    

# # ----------------------- HTTP ROUTE -----------------------
# @app.post("/send-sos")
# async def send_sos(
#     name: str = Body(...),
#     phone: str = Body(...),
#     lat: float = Body(...),
#     lng: float = Body(...),
#     T: float = Body(...),
#     P:float=Body(...)
# ):
#     """HTTP endpoint that triggers WebSocket broadcast."""
#     print("sos call")
#     payload = {
#         "type": "SOS_ALERT",
#         "name": name,
#         "phone": phone,
#         "lat": lat,
#         "lng": lng,
#     }

#     # Broadcast to WebSocket clients
#     await broadcast(payload)

#     return {"status": "sent", "clients": len(connected_clients)}


# # ----------------------- WEBSOCKET ROUTE -----------------------
# @app.websocket("/ws")
# async def websocket_endpoint(websocket: WebSocket):
#     await websocket.accept()
#     print("Client connected!")
#     connected_clients.add(websocket)

#     try:
#         while True:
#             data = await websocket.receive_text()
#             print("Received WS:", data)

#     except WebSocketDisconnect:
#         print("Client disconnected")
#         connected_clients.remove(websocket)




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
