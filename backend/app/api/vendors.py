from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.db import get_db
from app.core.security import get_current_user
from app.schemas.pydantic_schemas import UserSession, VendorCreate, VendorResponse
from app.models import database as models

router = APIRouter()

@router.post("/", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
def create_vendor(
    vendor_in: VendorCreate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_vendor = models.Vendor(
        org_id=current_user.org_id,
        name=vendor_in.name,
        contact_name=vendor_in.contact_name,
        email=vendor_in.email,
        phone=vendor_in.phone,
        category=vendor_in.category
    )
    db.add(db_vendor)
    db.commit()
    db.refresh(db_vendor)
    return db_vendor

@router.get("/", response_model=List[VendorResponse])
def get_vendors(
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.Vendor).filter(models.Vendor.org_id == current_user.org_id).all()

@router.get("/work-orders", response_model=List[dict])
def get_assigned_work_orders(
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Vendor-specific view of dispatched maintenance work orders.
    """
    # Simply load all requests with detailed unit/property structures for vendors
    tickets = db.query(models.MaintenanceRequest).filter(
        models.MaintenanceRequest.org_id == current_user.org_id
    ).all()
    
    output = []
    for t in tickets:
        unit = db.query(models.Unit).filter(models.Unit.id == t.unit_id).first()
        prop = db.query(models.Property).filter(models.Property.id == unit.property_id).first() if unit else None
        
        output.append({
            "id": t.id,
            "category": t.category,
            "priority": t.priority,
            "status": t.status,
            "description": t.description,
            "created_at": t.created_at,
            "address": f"{prop.name} - Unit {unit.unit_number}" if prop and unit else "N/A"
        })
    return output
