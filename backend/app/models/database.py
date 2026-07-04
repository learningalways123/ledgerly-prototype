import uuid
from sqlalchemy import Column, String, Column as DbColumn, Integer, ForeignKey, Date, DateTime, Table, Numeric, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.db import Base

# Association table for Lease and TenantProfile many-to-many relationship
lease_tenants = Table(
    "lease_tenants",
    Base.metadata,
    Column("lease_id", String(36), ForeignKey("leases.id", ondelete="CASCADE"), primary_key=True),
    Column("tenant_profile_id", String(36), ForeignKey("tenant_profiles.id", ondelete="CASCADE"), primary_key=True)
)

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    plan_tier = Column(String(50), nullable=False, default="starter")
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_connect_account_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    properties = relationship("Property", back_populates="organization", cascade="all, delete-orphan")
    leases = relationship("Lease", back_populates="organization", cascade="all, delete-orphan")
    tenant_profiles = relationship("TenantProfile", back_populates="organization", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="organization", cascade="all, delete-orphan")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="organization", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="organization", cascade="all, delete-orphan")
    vendors = relationship("Vendor", back_populates="organization", cascade="all, delete-orphan")
    property_owners = relationship("PropertyOwner", back_populates="organization", cascade="all, delete-orphan")
    trust_ledger_entries = relationship("TrustLedgerEntry", back_populates="organization", cascade="all, delete-orphan")


class PropertyOwner(Base):
    __tablename__ = "property_owners"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    stripe_connect_account_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="property_owners")
    properties = relationship("Property", back_populates="owner")
    trust_ledger_entries = relationship("TrustLedgerEntry", back_populates="owner")


class Property(Base):
    __tablename__ = "properties"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    address_line1 = Column(String(255), nullable=False)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False)
    zip = Column(String(20), nullable=False)
    property_type = Column(String(50), nullable=False)  # 'single_family', 'multifamily'
    unit_count = Column(Integer, nullable=False, default=1)
    owner_id = Column(String(36), ForeignKey("property_owners.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="properties")
    owner = relationship("PropertyOwner", back_populates="properties")
    units = relationship("Unit", back_populates="property", cascade="all, delete-orphan")
    trust_ledger_entries = relationship("TrustLedgerEntry", back_populates="property")


class Unit(Base):
    __tablename__ = "units"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    property_id = Column(String(36), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_number = Column(String(50), nullable=False)
    bed_count = Column(Integer, nullable=False)
    bath_count = Column(Numeric(3, 1), nullable=False)
    square_feet = Column(Integer, nullable=True)
    market_rent_cents = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False, default="vacant")  # 'vacant', 'occupied', 'maintenance'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    property = relationship("Property", back_populates="units")
    leases = relationship("Lease", back_populates="unit")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="unit")
    applications = relationship("Application", back_populates="unit", cascade="all, delete-orphan")


class Lease(Base):
    __tablename__ = "leases"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_id = Column(String(36), ForeignKey("units.id"), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="draft")  # 'draft', 'active', 'expired', 'terminated'
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    rent_amount_cents = Column(Integer, nullable=False)
    deposit_amount_cents = Column(Integer, nullable=False)
    late_fee_type = Column(String(50), default="flat")  # 'flat', 'percentage'
    late_fee_value_cents = Column(Integer, default=0)
    grace_period_days = Column(Integer, default=5)
    signed_lease_url = Column(String(512), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="leases")
    unit = relationship("Unit", back_populates="leases")
    tenants = relationship("TenantProfile", secondary=lease_tenants, back_populates="leases")
    payments = relationship("Payment", back_populates="lease")


class TenantProfile(Base):
    __tablename__ = "tenant_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(255), unique=True, index=True, nullable=True)  # Clerk User ID
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    stripe_customer_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="tenant_profiles")
    leases = relationship("Lease", secondary=lease_tenants, back_populates="tenants")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="tenant")


class Application(Base):
    __tablename__ = "applications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_id = Column(String(36), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    income_cents = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False, default="submitted")  # 'submitted', 'screening_pending', 'approved', 'denied', 'adverse_action_sent'
    credit_score = Column(Integer, nullable=True)
    criminal_background = Column(String(255), nullable=True)
    eviction_history = Column(String(255), nullable=True)
    screening_report_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="applications")
    unit = relationship("Unit", back_populates="applications")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    lease_id = Column(String(36), ForeignKey("leases.id"), nullable=False, index=True)
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String(3), nullable=False, default="usd")
    method = Column(String(50), nullable=False)  # 'ach', 'card'
    stripe_payment_intent_id = Column(String(255), unique=True, nullable=True)
    stripe_transfer_id = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False)  # 'pending', 'succeeded', 'failed', 'refunded'
    late_fee_applied_cents = Column(Integer, default=0)
    due_date = Column(Date, nullable=False)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="payments")
    lease = relationship("Lease", back_populates="payments")


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    contact_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    category = Column(String(100), nullable=False)  # 'plumbing', 'electrical', 'hvac', 'appliance', etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="vendors")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="vendor")


class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_id = Column(String(36), ForeignKey("units.id"), nullable=False, index=True)
    tenant_id = Column(String(36), ForeignKey("tenant_profiles.id"), nullable=False, index=True)
    category = Column(String(100), nullable=False)  # 'plumbing', 'electrical', 'hvac', 'appliance', etc.
    priority = Column(String(50), nullable=False, default="normal")  # 'low', 'normal', 'high', 'emergency'
    status = Column(String(50), nullable=False, default="submitted")  # 'submitted', 'triaged', 'assigned', 'in_progress', 'resolved'
    description = Column(Text, nullable=False)
    photo_urls = Column(String(2048), nullable=True)  # Stored as comma-separated or JSON string
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="maintenance_requests")
    unit = relationship("Unit", back_populates="maintenance_requests")
    tenant = relationship("TenantProfile", back_populates="maintenance_requests")
    vendor = relationship("Vendor", back_populates="maintenance_requests")


class TrustLedgerEntry(Base):
    __tablename__ = "trust_ledger_entries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    property_id = Column(String(36), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_id = Column(String(36), ForeignKey("property_owners.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # 'rent_received', 'pm_fee', 'payout', 'security_hold', 'security_release'
    amount_cents = Column(Integer, nullable=False)
    reference_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="trust_ledger_entries")
    property = relationship("Property", back_populates="trust_ledger_entries")
    owner = relationship("PropertyOwner", back_populates="trust_ledger_entries")
