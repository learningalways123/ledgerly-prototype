from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.security import get_current_user
from app.models import database as models
from app.schemas.pydantic_schemas import TenantProfileResponse, TenantProfileCreate, UserSession

router = APIRouter(tags=["tenants"])

@router.get("/", response_model=List[TenantProfileResponse])
def get_tenants(
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tenants = db.query(models.TenantProfile).filter(
        models.TenantProfile.org_id == current_user.org_id
    ).all()
    return tenants

@router.post("/", response_model=TenantProfileResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(
    tenant_in: TenantProfileCreate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_tenant = models.TenantProfile(
        org_id=current_user.org_id,
        first_name=tenant_in.first_name,
        last_name=tenant_in.last_name,
        email=tenant_in.email,
        phone=tenant_in.phone
    )
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    return new_tenant
