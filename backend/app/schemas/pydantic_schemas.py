from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal

# Organization Schemas
class OrganizationBase(BaseModel):
    name: str

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationResponse(OrganizationBase):
    id: str
    plan_tier: str
    stripe_customer_id: Optional[str] = None
    stripe_connect_account_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Property Owner Schemas
class PropertyOwnerBase(BaseModel):
    name: str
    email: EmailStr

class PropertyOwnerCreate(PropertyOwnerBase):
    pass

class PropertyOwnerResponse(PropertyOwnerBase):
    id: str
    org_id: str
    stripe_connect_account_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Property Schemas
class PropertyBase(BaseModel):
    name: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    zip: str
    property_type: str
    unit_count: int = 1
    owner_id: Optional[str] = None

class PropertyCreate(PropertyBase):
    pass

class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    property_type: Optional[str] = None
    unit_count: Optional[int] = None
    owner_id: Optional[str] = None

class PropertyResponse(PropertyBase):
    id: str
    org_id: str
    created_at: datetime
    owner: Optional[PropertyOwnerResponse] = None

    class Config:
        from_attributes = True


# Unit Schemas
class UnitBase(BaseModel):
    unit_number: str
    bed_count: int
    bath_count: float
    square_feet: Optional[int] = None
    market_rent_cents: int
    status: str = "vacant"

class UnitCreate(UnitBase):
    property_id: str

class UnitUpdate(BaseModel):
    unit_number: Optional[str] = None
    bed_count: Optional[int] = None
    bath_count: Optional[float] = None
    square_feet: Optional[int] = None
    market_rent_cents: Optional[int] = None
    status: Optional[str] = None

class UnitResponse(UnitBase):
    id: str
    property_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# TenantProfile Schemas
class TenantProfileBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None

class TenantProfileCreate(TenantProfileBase):
    org_id: str
    user_id: Optional[str] = None

class TenantProfileResponse(TenantProfileBase):
    id: str
    org_id: str
    user_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Lease Schemas
class LeaseBase(BaseModel):
    unit_id: str
    status: str = "draft"
    start_date: date
    end_date: date
    rent_amount_cents: int
    deposit_amount_cents: int
    late_fee_type: str = "flat"
    late_fee_value_cents: int = 0
    grace_period_days: int = 5
    signed_lease_url: Optional[str] = None

class LeaseCreate(LeaseBase):
    tenant_ids: List[str]  # List of TenantProfile IDs

class LeaseUpdate(BaseModel):
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    rent_amount_cents: Optional[int] = None
    deposit_amount_cents: Optional[int] = None
    late_fee_type: Optional[str] = None
    late_fee_value_cents: Optional[int] = None
    grace_period_days: Optional[int] = None
    signed_lease_url: Optional[str] = None
    tenant_ids: Optional[List[str]] = None

class LeaseResponse(LeaseBase):
    id: str
    org_id: str
    created_at: datetime
    tenants: List[TenantProfileResponse] = []

    class Config:
        from_attributes = True


# Application Schemas (Phase 2)
class ApplicationBase(BaseModel):
    unit_id: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    income_cents: int

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    credit_score: Optional[int] = None
    criminal_background: Optional[str] = None
    eviction_history: Optional[str] = None
    screening_report_url: Optional[str] = None

class ApplicationResponse(ApplicationBase):
    id: str
    org_id: str
    status: str
    credit_score: Optional[int] = None
    criminal_background: Optional[str] = None
    eviction_history: Optional[str] = None
    screening_report_url: Optional[str] = None
    created_at: datetime
    unit: Optional[UnitResponse] = None

    class Config:
        from_attributes = True


# Payment Schemas
class PaymentBase(BaseModel):
    lease_id: str
    amount_cents: int
    currency: str = "usd"
    method: str
    due_date: date

class PaymentCreate(PaymentBase):
    pass

class PaymentResponse(PaymentBase):
    id: str
    org_id: str
    stripe_payment_intent_id: Optional[str] = None
    status: str
    late_fee_applied_cents: int
    paid_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Vendor Schemas (Phase 3)
class VendorBase(BaseModel):
    name: str
    contact_name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    category: str

class VendorCreate(VendorBase):
    pass

class VendorResponse(VendorBase):
    id: str
    org_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# MaintenanceRequest Schemas
class MaintenanceRequestBase(BaseModel):
    unit_id: str
    category: str
    priority: str = "normal"
    description: str
    photo_urls: Optional[str] = None

class MaintenanceRequestCreate(MaintenanceRequestBase):
    pass

class MaintenanceRequestUpdate(BaseModel):
    priority: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    photo_urls: Optional[str] = None
    vendor_id: Optional[str] = None

class MaintenanceRequestResponse(MaintenanceRequestBase):
    id: str
    org_id: str
    tenant_id: str
    status: str
    vendor_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    tenant: TenantProfileResponse
    vendor: Optional[VendorResponse] = None

    class Config:
        from_attributes = True


# Trust Ledger Entry Schemas (Phase 3)
class TrustLedgerEntryResponse(BaseModel):
    id: str
    org_id: str
    property_id: str
    owner_id: str
    type: str
    amount_cents: int
    reference_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Auth User Session Schemas
class UserSession(BaseModel):
    user_id: str
    org_id: str
    roles: List[str] = []


# Plaid Schemas
class PlaidLinkTokenResponse(BaseModel):
    link_token: str

class PlaidExchangeTokenRequest(BaseModel):
    public_token: str
    lease_id: str

class PlaidExchangeTokenResponse(BaseModel):
    success: bool
    message: str


# AI Chat Assistant Schemas
class AIChatRequest(BaseModel):
    query: str

class AIChatResponse(BaseModel):
    answer: str
