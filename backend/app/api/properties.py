from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.db import get_db
from app.core.security import get_current_user
from app.schemas.pydantic_schemas import UserSession, PropertyCreate, PropertyResponse, PropertyUpdate, UnitCreate, UnitResponse, UnitUpdate
from app.models import database as models

router = APIRouter()

# --- Properties Endpoints ---

@router.post("/", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
def create_property(
    property_in: PropertyCreate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ensure organization exists, create one if mock
    org = db.query(models.Organization).filter(models.Organization.id == current_user.org_id).first()
    if not org:
        org = models.Organization(id=current_user.org_id, name="Acme Property Management")
        db.add(org)
        db.commit()

    db_property = models.Property(
        org_id=current_user.org_id,
        name=property_in.name,
        address_line1=property_in.address_line1,
        address_line2=property_in.address_line2,
        city=property_in.city,
        state=property_in.state,
        zip=property_in.zip,
        property_type=property_in.property_type,
        unit_count=property_in.unit_count,
        owner_id=property_in.owner_id
    )
    db.add(db_property)
    db.commit()
    db.refresh(db_property)
    return db_property

@router.get("/", response_model=List[PropertyResponse])
def get_properties(
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # RLS enforced via current_user.org_id
    return db.query(models.Property).filter(models.Property.org_id == current_user.org_id).all()

@router.get("/{property_id}", response_model=PropertyResponse)
def get_property(
    property_id: str,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_property = db.query(models.Property).filter(
        models.Property.id == property_id,
        models.Property.org_id == current_user.org_id
    ).first()
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")
    return db_property

@router.patch("/{property_id}", response_model=PropertyResponse)
def update_property(
    property_id: str,
    property_in: PropertyUpdate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_property = db.query(models.Property).filter(
        models.Property.id == property_id,
        models.Property.org_id == current_user.org_id
    ).first()
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    update_data = property_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_property, key, value)
        
    db.commit()
    db.refresh(db_property)
    return db_property

@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property(
    property_id: str,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_property = db.query(models.Property).filter(
        models.Property.id == property_id,
        models.Property.org_id == current_user.org_id
    ).first()
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    db.delete(db_property)
    db.commit()
    return None


# --- Units Endpoints ---

@router.post("/units", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
def create_unit(
    unit_in: UnitCreate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify landlord owns property
    db_property = db.query(models.Property).filter(
        models.Property.id == unit_in.property_id,
        models.Property.org_id == current_user.org_id
    ).first()
    if not db_property:
        raise HTTPException(status_code=404, detail="Parent property not found or unauthorized")
        
    db_unit = models.Unit(
        property_id=unit_in.property_id,
        unit_number=unit_in.unit_number,
        bed_count=unit_in.bed_count,
        bath_count=unit_in.bath_count,
        square_feet=unit_in.square_feet,
        market_rent_cents=unit_in.market_rent_cents,
        status=unit_in.status
    )
    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)
    return db_unit

@router.get("/units/{unit_id}", response_model=UnitResponse)
def get_unit(
    unit_id: str,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Filter by joining Property to verify org_id
    db_unit = db.query(models.Unit).join(models.Property).filter(
        models.Unit.id == unit_id,
        models.Property.org_id == current_user.org_id
    ).first()
    
    if not db_unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return db_unit

@router.get("/{property_id}/units", response_model=List[UnitResponse])
def get_property_units(
    property_id: str,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify landlord owns property
    db_property = db.query(models.Property).filter(
        models.Property.id == property_id,
        models.Property.org_id == current_user.org_id
    ).first()
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")
        
    return db.query(models.Unit).filter(models.Unit.property_id == property_id).all()

@router.patch("/units/{unit_id}", response_model=UnitResponse)
def update_unit(
    unit_id: str,
    unit_in: UnitUpdate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_unit = db.query(models.Unit).join(models.Property).filter(
        models.Unit.id == unit_id,
        models.Property.org_id == current_user.org_id
    ).first()
    
    if not db_unit:
        raise HTTPException(status_code=404, detail="Unit not found")
        
    update_data = unit_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_unit, key, value)
        
    db.commit()
    db.refresh(db_unit)
    return db_unit

@router.delete("/units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unit(
    unit_id: str,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_unit = db.query(models.Unit).join(models.Property).filter(
        models.Unit.id == unit_id,
        models.Property.org_id == current_user.org_id
    ).first()
    
    if not db_unit:
        raise HTTPException(status_code=404, detail="Unit not found")
        
    db.delete(db_unit)
    db.commit()
    return None
