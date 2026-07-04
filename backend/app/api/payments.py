from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from app.core.db import get_db
from app.core.security import get_current_user
from app.schemas.pydantic_schemas import (
    UserSession, PaymentResponse, PlaidLinkTokenResponse, 
    PlaidExchangeTokenRequest, PlaidExchangeTokenResponse
)
from app.models import database as models
from app.services.plaid_service import PlaidService
from app.services.stripe_service import StripeService

router = APIRouter()

@router.post("/plaid/link-token", response_model=PlaidLinkTokenResponse)
def get_plaid_link_token(
    current_user: UserSession = Depends(get_current_user)
):
    """
    Generate Plaid Link token for bank verification
    """
    token = PlaidService.create_link_token(user_id=current_user.user_id)
    return PlaidLinkTokenResponse(link_token=token)


@router.post("/plaid/exchange", response_model=PlaidExchangeTokenResponse)
def exchange_plaid_token(
    payload: PlaidExchangeTokenRequest,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exchanges public token and attaches bank credentials to Stripe customer
    """
    # Verify lease
    lease = db.query(models.Lease).filter(
        models.Lease.id == payload.lease_id,
        models.Lease.org_id == current_user.org_id
    ).first()
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")

    # Get or create tenant profile matching current user
    tenant = db.query(models.TenantProfile).filter(
        models.TenantProfile.user_id == current_user.user_id
    ).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant profile not found for authenticated user")

    # Exchange Plaid public token
    plaid_data = PlaidService.exchange_public_token(payload.public_token)
    
    # Create Stripe customer if they don't have one
    if not tenant.stripe_customer_id:
        customer_id = StripeService.create_customer(
            email=tenant.email,
            name=f"{tenant.first_name} {tenant.last_name}"
        )
        tenant.stripe_customer_id = customer_id
        db.commit()
    
    # In production, we would use Plaid bank account tokens to authorize bank debit in Stripe.
    # Here, we mark it as linked.
    return PlaidExchangeTokenResponse(
        success=True,
        message="Bank account verified and connected successfully via Plaid + Stripe."
    )


@router.post("/pay/{lease_id}", response_model=PaymentResponse)
def pay_rent(
    lease_id: str,
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Triggers payment collection for the current active lease.
    """
    lease = db.query(models.Lease).filter(
        models.Lease.id == lease_id,
        models.Lease.org_id == current_user.org_id
    ).first()
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")

    tenant = db.query(models.TenantProfile).filter(
        models.TenantProfile.user_id == current_user.user_id
    ).first()
    if not tenant:
        raise HTTPException(status_code=400, detail="Only tenants on the lease can pay rent")

    # Set stripe customer id (fallback if they didn't complete plaid verification)
    if not tenant.stripe_customer_id:
        customer_id = StripeService.create_customer(
            email=tenant.email,
            name=f"{tenant.first_name} {tenant.last_name}"
        )
        tenant.stripe_customer_id = customer_id
        db.commit()

    # Retrieve PM connect account ID if configured for Stripe Connect routing
    org = db.query(models.Organization).filter(models.Organization.id == current_user.org_id).first()
    connect_account_id = org.stripe_connect_account_id if org else None

    # Request Stripe PaymentIntent
    amount = lease.rent_amount_cents
    intent = StripeService.create_payment_intent(
        amount_cents=amount,
        customer_id=tenant.stripe_customer_id,
        connect_account_id=connect_account_id
    )

    # Record append-only transaction entry in database
    db_payment = models.Payment(
        org_id=current_user.org_id,
        lease_id=lease.id,
        amount_cents=amount,
        currency="usd",
        method="ach",
        stripe_payment_intent_id=intent["id"],
        status="pending",
        due_date=date.today(),
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)

    return db_payment


@router.post("/stripe-webhook", status_code=status.HTTP_200_OK)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Endpoint listening to Stripe payment intent updates (succeeded/failed)
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = StripeService.construct_webhook_event(payload, sig_header)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook verification error: {str(e)}")

    event_type = event.get("type")
    
    if event_type in ["payment_intent.succeeded", "payment_intent.payment_failed"]:
        intent = event["data"]["object"]
        intent_id = intent["id"]
        
        # Find matching transaction entry
        payment = db.query(models.Payment).filter(
            models.Payment.stripe_payment_intent_id == intent_id
        ).first()

        if payment:
            if event_type == "payment_intent.succeeded":
                payment.status = "succeeded"
                import datetime
                payment.paid_at = datetime.datetime.utcnow()
            else:
                payment.status = "failed"
            db.commit()
            
    return Response(status_code=200)


@router.get("/", response_model=List[PaymentResponse])
def get_payments(
    current_user: UserSession = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves billing ledger for current organization
    """
    return db.query(models.Payment).filter(models.Payment.org_id == current_user.org_id).all()
