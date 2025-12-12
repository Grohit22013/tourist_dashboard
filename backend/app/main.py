from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Routers
from app.routes import tourists
from app.routes.zones import router as zones_router
from app.routes import kyc_routes  # ✅ add this

from app.routes.location_routes import router as location_router

app = FastAPI(title="Tourist Digital ID Backend with Blockchain")

# Enable CORS for local dev (adjust origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: change to your frontend origin(s) in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount tourists endpoints under /tourists
app.include_router(tourists.router, prefix="/tourists", tags=["Tourists"])

# Mount KYC endpoints under /kyc
app.include_router(kyc_routes.router, prefix="/kyc", tags=["KYC"])

# Mount zones router (already has prefix="/api")
app.include_router(zones_router, tags=["Geofence"])

# Mount alerts endpoints under /alerts
app.include_router(tourists.alerts_router, prefix="/alerts", tags=["Alerts"])

app.include_router(location_router)

@app.on_event("startup")
async def _print_routes():
    print("Registered routes:")
    for r in app.router.routes:
        try:
            print(" -", getattr(r, "methods", None), getattr(r, "path", None))
        except Exception:
            pass


@app.get("/", tags=["Root"])
async def root():
    return {"message": "✅ Tourist Blockchain Digital ID Backend Running"}
