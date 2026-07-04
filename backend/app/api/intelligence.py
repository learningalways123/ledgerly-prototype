from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.security import get_current_user
from app.schemas.pydantic_schemas import UserSession, AIChatRequest, AIChatResponse
from app.models import database as models
from app.services.gemini_service import GeminiService

router = APIRouter()

@router.post("/triage", response_model=dict)
def triage_maintenance_ticket(
    payload: dict,
    current_user: UserSession = Depends(get_current_user)
):
    """
    Leverages Gemini to classify repair urgency and route correctly.
    """
    desc = payload.get("description", "")
    if not desc:
        raise HTTPException(status_code=400, detail="Description is required")

    triage_result = GeminiService.triage_maintenance(desc)
    return triage_result


@router.post("/assistant", response_model=AIChatResponse)
def ask_portfolio_assistant(
    payload: AIChatRequest,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Confronts Gemini with real-time portfolio metrics (RAG Context) to solve user queries.
    """
    # 1. Gather database statistics for RAG Context
    properties_count = db.query(models.Property).filter(models.Property.org_id == current_user.org_id).count()
    active_leases_count = db.query(models.Lease).filter(
        models.Lease.org_id == current_user.org_id,
        models.Lease.status == "active"
    ).count()
    
    payments = db.query(models.Payment).filter(models.Payment.org_id == current_user.org_id).all()
    revenue_cents = sum(p.amount_cents for p in payments if p.status == "succeeded")
    outstanding_cents = sum(p.amount_cents for p in payments if p.status == "pending")
    
    maintenance_count = db.query(models.MaintenanceRequest).filter(
        models.MaintenanceRequest.org_id == current_user.org_id,
        models.MaintenanceRequest.status != "resolved"
    ).count()

    db_context = {
        "properties_count": properties_count,
        "active_leases_count": active_leases_count,
        "revenue_cents": revenue_cents,
        "outstanding_cents": outstanding_cents,
        "maintenance_count": maintenance_count
    }

    # 2. Invoke chat assistant
    answer = GeminiService.chat_assistant(query=payload.query, db_context=db_context)
    return AIChatResponse(answer=answer)
