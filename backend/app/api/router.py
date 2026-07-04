from fastapi import APIRouter
from app.api import properties, leases, payments, maintenance, screening, accounting, vendors, intelligence

api_router = APIRouter()

api_router.include_router(properties.router, prefix="/properties", tags=["properties"])
api_router.include_router(leases.router, prefix="/leases", tags=["leases"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(maintenance.router, prefix="/maintenance", tags=["maintenance"])
api_router.include_router(screening.router, prefix="/screening", tags=["screening"])
api_router.include_router(accounting.router, prefix="/accounting", tags=["accounting"])
api_router.include_router(vendors.router, prefix="/vendors", tags=["vendors"])
api_router.include_router(intelligence.router, prefix="/intelligence", tags=["intelligence"])
