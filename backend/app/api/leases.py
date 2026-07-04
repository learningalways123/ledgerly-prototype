from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.db import get_db
from app.core.security import get_current_user
from app.schemas.pydantic_schemas import UserSession, LeaseCreate, LeaseResponse, LeaseUpdate
from app.models import database as models

router = APIRouter()

@router.post("/", response_model=LeaseResponse, status_code=status.HTTP_201_CREATED)
def create_lease(
    lease_in: LeaseCreate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify landlord owns property unit
    unit = db.query(models.Unit).join(models.Property).filter(
        models.Unit.id == lease_in.unit_id,
        models.Property.org_id == current_user.org_id
    ).first()
    
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found or unauthorized")

    # Verify all tenants belong to same organization or exist
    tenants = []
    for tenant_id in lease_in.tenant_ids:
        tenant = db.query(models.TenantProfile).filter(
            models.TenantProfile.id == tenant_id,
            models.TenantProfile.org_id == current_user.org_id
        ).first()
        if not tenant:
            raise HTTPException(
                status_code=404, 
                detail=f"Tenant profile with ID {tenant_id} not found in this organization"
            )
        tenants.append(tenant)

    db_lease = models.Lease(
        org_id=current_user.org_id,
        unit_id=lease_in.unit_id,
        status=lease_in.status,
        start_date=lease_in.start_date,
        end_date=lease_in.end_date,
        rent_amount_cents=lease_in.rent_amount_cents,
        deposit_amount_cents=lease_in.deposit_amount_cents,
        late_fee_type=lease_in.late_fee_type,
        late_fee_value_cents=lease_in.late_fee_value_cents,
        grace_period_days=lease_in.grace_period_days,
        signed_lease_url=lease_in.signed_lease_url,
        tenants=tenants
    )
    db.add(db_lease)
    db.commit()
    db.refresh(db_lease)
    return db_lease

@router.get("/", response_model=List[LeaseResponse])
def get_leases(
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.Lease).filter(models.Lease.org_id == current_user.org_id).all()

@router.get("/{lease_id}", response_model=LeaseResponse)
def get_lease(
    lease_id: str,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_lease = db.query(models.Lease).filter(
        models.Lease.id == lease_id,
        models.Lease.org_id == current_user.org_id
    ).first()
    if not db_lease:
        raise HTTPException(status_code=404, detail="Lease not found")
    return db_lease

@router.patch("/{lease_id}", response_model=LeaseResponse)
def update_lease(
    lease_id: str,
    lease_in: LeaseUpdate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_lease = db.query(models.Lease).filter(
        models.Lease.id == lease_id,
        models.Lease.org_id == current_user.org_id
    ).first()
    if not db_lease:
        raise HTTPException(status_code=404, detail="Lease not found")

    update_data = lease_in.model_dump(exclude_unset=True)
    tenant_ids = update_data.pop("tenant_ids", None)
    
    for key, value in update_data.items():
        setattr(db_lease, key, value)

    if tenant_ids is not None:
        tenants = []
        for tenant_id in tenant_ids:
            tenant = db.query(models.TenantProfile).filter(
                models.TenantProfile.id == tenant_id,
                models.TenantProfile.org_id == current_user.org_id
            ).first()
            if not tenant:
                raise HTTPException(status_code=404, detail=f"Tenant {tenant_id} not found")
            tenants.append(tenant)
        db_lease.tenants = tenants

    db.commit()
    db.refresh(db_lease)
    return db_lease

@router.delete("/{lease_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lease(
    lease_id: str,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_lease = db.query(models.Lease).filter(
        models.Lease.id == lease_id,
        models.Lease.org_id == current_user.org_id
    ).first()
    if not db_lease:
        raise HTTPException(status_code=404, detail="Lease not found")
    
    db.delete(db_lease)
    db.commit()
    return None
