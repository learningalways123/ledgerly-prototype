from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.db import get_db
from app.core.security import get_current_user
from app.schemas.pydantic_schemas import UserSession, MaintenanceRequestCreate, MaintenanceRequestResponse, MaintenanceRequestUpdate
from app.models import database as models

router = APIRouter()

@router.post("/", response_model=MaintenanceRequestResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance_request(
    request_in: MaintenanceRequestCreate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify the unit exists
    unit = db.query(models.Unit).join(models.Property).filter(
        models.Unit.id == request_in.unit_id,
        models.Property.org_id == current_user.org_id
    ).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found or unauthorized")

    # Retrieve tenant profile corresponding to active user
    tenant = db.query(models.TenantProfile).filter(
        models.TenantProfile.user_id == current_user.user_id
    ).first()
    
    # In development, auto-create a tenant profile if it doesn't exist yet
    if not tenant:
        tenant = models.TenantProfile(
            org_id=current_user.org_id,
            user_id=current_user.user_id,
            first_name="Mock",
            last_name="Tenant",
            email="tenant@example.com"
        )
        db.add(tenant)
        db.commit()
        db.refresh(tenant)

    db_request = models.MaintenanceRequest(
        org_id=current_user.org_id,
        unit_id=request_in.unit_id,
        tenant_id=tenant.id,
        category=request_in.category,
        priority=request_in.priority,
        status="submitted",
        description=request_in.description,
        photo_urls=request_in.photo_urls
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request

@router.get("/", response_model=List[MaintenanceRequestResponse])
def get_maintenance_requests(
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # If the user has a landlord role, show all requests. If tenant, filter by tenant_id.
    query = db.query(models.MaintenanceRequest).filter(
        models.MaintenanceRequest.org_id == current_user.org_id
    )
    
    if "tenant" in current_user.roles:
        tenant = db.query(models.TenantProfile).filter(
            models.TenantProfile.user_id == current_user.user_id
        ).first()
        if tenant:
            query = query.filter(models.MaintenanceRequest.tenant_id == tenant.id)
            
    return query.all()

@router.get("/{request_id}", response_model=MaintenanceRequestResponse)
def get_maintenance_request(
    request_id: str,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_request = db.query(models.MaintenanceRequest).filter(
        models.MaintenanceRequest.id == request_id,
        models.MaintenanceRequest.org_id == current_user.org_id
    ).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
        
    # If tenant, verify ownership
    if "tenant" in current_user.roles:
        tenant = db.query(models.TenantProfile).filter(models.TenantProfile.user_id == current_user.user_id).first()
        if tenant and db_request.tenant_id != tenant.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            
    return db_request

@router.patch("/{request_id}", response_model=MaintenanceRequestResponse)
def update_maintenance_request(
    request_id: str,
    request_in: MaintenanceRequestUpdate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_request = db.query(models.MaintenanceRequest).filter(
        models.MaintenanceRequest.id == request_id,
        models.MaintenanceRequest.org_id == current_user.org_id
    ).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Maintenance request not found")

    # If tenant, they can only modify the description or priority, not the status or vendor
    if "tenant" in current_user.roles:
        tenant = db.query(models.TenantProfile).filter(models.TenantProfile.user_id == current_user.user_id).first()
        if not tenant or db_request.tenant_id != tenant.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
        if request_in.status is not None or request_in.vendor_id is not None:
            raise HTTPException(status_code=400, detail="Tenants cannot assign status or vendor updates")

    update_data = request_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_request, key, value)

    db.commit()
    db.refresh(db_request)
    return db_request

@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_maintenance_request(
    request_id: str,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_request = db.query(models.MaintenanceRequest).filter(
        models.MaintenanceRequest.id == request_id,
        models.MaintenanceRequest.org_id == current_user.org_id
    ).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
        
    if "tenant" in current_user.roles:
        tenant = db.query(models.TenantProfile).filter(models.TenantProfile.user_id == current_user.user_id).first()
        if not tenant or db_request.tenant_id != tenant.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    db.delete(db_request)
    db.commit()
    return None
