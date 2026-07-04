from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.db import get_db
from app.core.security import get_current_user
from app.schemas.pydantic_schemas import UserSession, PropertyOwnerCreate, PropertyOwnerResponse, TrustLedgerEntryResponse
from app.models import database as models

router = APIRouter()

@router.post("/owners", response_model=PropertyOwnerResponse, status_code=status.HTTP_201_CREATED)
def create_owner(
    owner_in: PropertyOwnerCreate,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    owner = models.PropertyOwner(
        org_id=current_user.org_id,
        name=owner_in.name,
        email=owner_in.email,
        stripe_connect_account_id=f"acct_mock_{owner_in.name.replace(' ', '_').lower()[:10]}"
    )
    db.add(owner)
    db.commit()
    db.refresh(owner)
    return owner

@router.get("/owners", response_model=List[PropertyOwnerResponse])
def get_owners(
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.PropertyOwner).filter(models.PropertyOwner.org_id == current_user.org_id).all()

@router.get("/ledger", response_model=List[TrustLedgerEntryResponse])
def get_ledger(
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.TrustLedgerEntry).filter(models.TrustLedgerEntry.org_id == current_user.org_id).all()

@router.post("/owners/{owner_id}/payout", status_code=status.HTTP_200_OK)
def trigger_owner_payout(
    owner_id: str,
    amount_cents: int,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Distribute payouts to owner based on rental revenue, creating trust ledger logs.
    """
    owner = db.query(models.PropertyOwner).filter(
        models.PropertyOwner.id == owner_id,
        models.PropertyOwner.org_id == current_user.org_id
    ).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Property owner not found")

    # Verify matching property
    properties = db.query(models.Property).filter(models.Property.owner_id == owner_id).all()
    if not properties:
         raise HTTPException(status_code=400, detail="Owner is not linked to any properties")

    target_property = properties[0]

    # Create append-only Trust Ledger entries
    # 1. Deduct payout amount
    payout_entry = models.TrustLedgerEntry(
        org_id=current_user.org_id,
        property_id=target_property.id,
        owner_id=owner_id,
        type="payout",
        amount_cents=-amount_cents,
        reference_id=f"tr_mock_payout_{owner_id[:8]}"
    )
    
    # 2. Record management fee (10% PM fee)
    pm_fee = int(amount_cents * 0.1)
    fee_entry = models.TrustLedgerEntry(
        org_id=current_user.org_id,
        property_id=target_property.id,
        owner_id=owner_id,
        type="pm_fee",
        amount_cents=-pm_fee,
        reference_id=f"tr_mock_fee_{owner_id[:8]}"
    )

    db.add(payout_entry)
    db.add(fee_entry)
    db.commit()

    return {"status": "payout_succeeded", "stripe_transfer_id": payout_entry.reference_id, "amount_cents": amount_cents, "pm_fee_cents": pm_fee}

@router.post("/quickbooks/sync", status_code=status.HTTP_200_OK)
def sync_quickbooks(
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Simulates syncing Ledgerly's transactions and ledgers to QuickBooks Online.
    """
    payments_count = db.query(models.Payment).filter(models.Payment.org_id == current_user.org_id).count()
    ledger_count = db.query(models.TrustLedgerEntry).filter(models.TrustLedgerEntry.org_id == current_user.org_id).count()
    
    return {
        "status": "success",
        "synced_records": {
            "invoices": payments_count,
            "ledger_journals": ledger_count
        },
        "message": "Exported charts of accounts and cash entries to QuickBooks Online."
    }
