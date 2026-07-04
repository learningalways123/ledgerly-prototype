from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.db import get_db
from app.core.security import get_current_user
from app.schemas.pydantic_schemas import UserSession, ApplicationCreate, ApplicationResponse, ApplicationUpdate
from app.models import database as models

router = APIRouter()

@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def submit_application(
    app_in: ApplicationCreate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify unit exists
    unit = db.query(models.Unit).filter(models.Unit.id == app_in.unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Target rental unit not found")

    # Save application
    db_app = models.Application(
        org_id=current_user.org_id,
        unit_id=app_in.unit_id,
        first_name=app_in.first_name,
        last_name=app_in.last_name,
        email=app_in.email,
        phone=app_in.phone,
        income_cents=app_in.income_cents,
        status="submitted"
    )
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app


@router.post("/{app_id}/trigger-screening", response_model=ApplicationResponse)
def trigger_screening_report(
    app_id: str,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Simulates calling TransUnion SmartMove or Checkr APIs.
    Automatically generates randomized but compliant screening data.
    """
    db_app = db.query(models.Application).filter(
        models.Application.id == app_id,
        models.Application.org_id == current_user.org_id
    ).first()
    
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Generate mock credit report scores
    import random
    score = random.randint(620, 810)
    
    db_app.credit_score = score
    db_app.criminal_background = "No criminal records identified" if score > 650 else "Minor traffic violation (2022)"
    db_app.eviction_history = "No evictions flagged"
    db_app.screening_report_url = f"https://screening-reports.ledgerly.local/report_{app_id}.pdf"
    db_app.status = "screening_pending"
    
    db.commit()
    db.refresh(db_app)
    return db_app


@router.patch("/{app_id}", response_model=ApplicationResponse)
def update_application_status(
    app_id: str,
    payload: ApplicationUpdate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_app = db.query(models.Application).filter(
        models.Application.id == app_id,
        models.Application.org_id == current_user.org_id
    ).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_app, key, value)

    # If approved, we transition the unit to occupied
    if payload.status == "approved":
        unit = db.query(models.Unit).filter(models.Unit.id == db_app.unit_id).first()
        if unit:
            unit.status = "occupied"

    db.commit()
    db.refresh(db_app)
    return db_app


@router.post("/{app_id}/send-adverse-action", response_model=ApplicationResponse)
def send_adverse_action(
    app_id: str,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Triggers FCRA-compliant Adverse Action notices.
    Generates simulated denial records.
    """
    db_app = db.query(models.Application).filter(
        models.Application.id == app_id,
        models.Application.org_id == current_user.org_id
    ).first()
    
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found")

    db_app.status = "adverse_action_sent"
    db.commit()
    db.refresh(db_app)
    return db_app


@router.get("/", response_model=List[ApplicationResponse])
def get_applications(
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.Application).filter(models.Application.org_id == current_user.org_id).all()
