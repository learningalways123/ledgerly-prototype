from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
import uuid
from app.core.db import get_db
from app.core.security import get_current_user
from app.schemas.pydantic_schemas import UserSession, LeaseCreate, LeaseResponse, LeaseUpdate, LeaseSignRequest
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
        if "@" in tenant_id:
            tenant = db.query(models.TenantProfile).filter(
                models.TenantProfile.email == tenant_id,
                models.TenantProfile.org_id == current_user.org_id
            ).first()
            if not tenant:
                parts = tenant_id.split("@")[0].split(".")
                first_name = parts[0].capitalize()
                last_name = parts[1].capitalize() if len(parts) > 1 else "Applicant"
                tenant = models.TenantProfile(
                    id=f"tenant_{uuid.uuid4().hex[:8]}",
                    org_id=current_user.org_id,
                    first_name=first_name,
                    last_name=last_name,
                    email=tenant_id
                )
                db.add(tenant)
                db.flush()
        else:
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
    
    original_end_date = db_lease.end_date
    original_status = db_lease.status

    for key, value in update_data.items():
        setattr(db_lease, key, value)

    needs_signature = False
    if "end_date" in update_data and update_data["end_date"] > original_end_date:
        needs_signature = True
    elif original_status in ["expired", "terminated"] and "status" not in update_data:
        needs_signature = True

    if needs_signature:
        db_lease.status = "draft"
        db_lease.tenant_consent_signed = False
        db_lease.tenant_signature_name = None
        db_lease.tenant_signed_at = None

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

@router.get("/tenant/my-lease", response_model=LeaseResponse)
def get_tenant_lease(
    request: Request,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    x_mock_email = request.headers.get("x-mock-user-email")
    tenant_profile = None
    if x_mock_email:
        tenant_profile = db.query(models.TenantProfile).filter(
            models.TenantProfile.email == x_mock_email
        ).first()

    if not tenant_profile:
        tenant_profile = db.query(models.TenantProfile).filter(
            models.TenantProfile.user_id == current_user.user_id
        ).first()

    if not tenant_profile:
        tenant_profile = db.query(models.TenantProfile).filter(
            models.TenantProfile.email == "sarah@aircare.com"
        ).first()

    if not tenant_profile:
        raise HTTPException(status_code=404, detail="Tenant profile not found in system")
        
    lease = db.query(models.Lease).filter(
        models.Lease.tenants.any(id=tenant_profile.id)
    ).order_by(models.Lease.created_at.desc()).first()
    
    if not lease:
        raise HTTPException(status_code=404, detail="No lease found for this tenant account")
    return lease

@router.post("/{lease_id}/sign", response_model=LeaseResponse)
def sign_lease(
    lease_id: str,
    sign_in: LeaseSignRequest,
    request: Request,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from datetime import datetime
    
    x_mock_email = request.headers.get("x-mock-user-email")
    tenant_profile = None
    if x_mock_email:
        tenant_profile = db.query(models.TenantProfile).filter(
            models.TenantProfile.email == x_mock_email
        ).first()

    if not tenant_profile:
        tenant_profile = db.query(models.TenantProfile).filter(
            models.TenantProfile.user_id == current_user.user_id
        ).first()

    if not tenant_profile:
        tenant_profile = db.query(models.TenantProfile).filter(
            models.TenantProfile.email == "sarah@aircare.com"
        ).first()
        
    if not tenant_profile:
        raise HTTPException(status_code=404, detail="Tenant profile not found in system")
        
    lease = db.query(models.Lease).filter(
        models.Lease.id == lease_id,
        models.Lease.tenants.any(id=tenant_profile.id)
    ).first()
    if not lease:
        raise HTTPException(status_code=404, detail="Lease agreement not found or unauthorized")
        
    if not sign_in.consent:
        raise HTTPException(status_code=400, detail="Digital signature consent is required")
        
    if not sign_in.signature_name.strip():
        raise HTTPException(status_code=400, detail="Signature name cannot be empty")
        
    lease.tenant_consent_signed = True
    lease.tenant_signature_name = sign_in.signature_name
    lease.tenant_signed_at = datetime.utcnow()
    lease.status = "active"
    
    # Transition unit to occupied
    unit = db.query(models.Unit).filter(models.Unit.id == lease.unit_id).first()
    if unit:
        unit.status = "occupied"
        
    db.commit()
    db.refresh(lease)
    return lease
