import sys
import os
from datetime import date, datetime

# Add parent directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.db import engine, SessionLocal, Base
from app.models import database as models

def seed():
    print("Resetting database tables...")
    # Drop all and recreate
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Seeding default Organization...")
        org = models.Organization(
            id="org_mock_123",
            name="Acme Property Management",
            plan_tier="growth"
        )
        db.add(org)
        
        print("Seeding Property Owner client...")
        owner = models.PropertyOwner(
            id="owner_1",
            org_id="org_mock_123",
            name="Arthur Dent",
            email="arthur.dent@example.com",
            stripe_connect_account_id="acct_mock_arthur_dent"
        )
        db.add(owner)
        db.commit()

        print("Seeding Properties...")
        prop1 = models.Property(
            id="prop_1",
            org_id="org_mock_123",
            name="Elm Street Apartments",
            address_line1="120 Elm St",
            city="Austin",
            state="TX",
            zip="78701",
            property_type="multifamily",
            unit_count=3,
            owner_id="owner_1"
        )
        prop2 = models.Property(
            id="prop_2",
            org_id="org_mock_123",
            name="Oak Lane Cottage",
            address_line1="45 Oak Ln",
            city="Austin",
            state="TX",
            zip="78704",
            property_type="single_family",
            unit_count=1,
            owner_id="owner_1"
        )
        db.add(prop1)
        db.add(prop2)
        db.commit()

        print("Seeding Units...")
        # Elm St Units
        u101 = models.Unit(
            id="unit_101",
            property_id="prop_1",
            unit_number="101",
            bed_count=2,
            bath_count=2.0,
            square_feet=950,
            market_rent_cents=180000,
            status="occupied"
        )
        u102 = models.Unit(
            id="unit_102",
            property_id="prop_1",
            unit_number="102",
            bed_count=2,
            bath_count=2.0,
            square_feet=950,
            market_rent_cents=185000,
            status="vacant"
        )
        u103 = models.Unit(
            id="unit_103",
            property_id="prop_1",
            unit_number="103",
            bed_count=1,
            bath_count=1.0,
            square_feet=650,
            market_rent_cents=140000,
            status="maintenance"
        )
        # Oak Lane Unit
        u_oak = models.Unit(
            id="unit_oak_a",
            property_id="prop_2",
            unit_number="A",
            bed_count=3,
            bath_count=2.5,
            square_feet=1600,
            market_rent_cents=280000,
            status="occupied"
        )
        db.add_all([u101, u102, u103, u_oak])
        db.commit()

        print("Seeding Tenant Profiles...")
        t1 = models.TenantProfile(
            id="tenant_1",
            org_id="org_mock_123",
            user_id="usr_mock_tenant_456",
            first_name="Alice",
            last_name="Smith",
            email="alice@example.com",
            phone="512-555-0144",
            stripe_customer_id="cus_mock_alice"
        )
        t2 = models.TenantProfile(
            id="tenant_2",
            org_id="org_mock_123",
            user_id="usr_mock_tenant_789",
            first_name="Bob",
            last_name="Jones",
            email="bob@example.com",
            phone="512-555-0166",
            stripe_customer_id="cus_mock_bob"
        )
        db.add_all([t1, t2])
        db.commit()

        print("Seeding Leases (Agreements)...")
        # Lease 1: Alice on Elm St 101
        lease1 = models.Lease(
            id="lease_1",
            org_id="org_mock_123",
            unit_id="unit_101",
            status="active",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            rent_amount_cents=180000,
            deposit_amount_cents=180000,
            late_fee_type="flat",
            late_fee_value_cents=5000,
            grace_period_days=5
        )
        lease1.tenants.append(t1)

        # Lease 2: Bob on Oak Lane Cottage
        lease2 = models.Lease(
            id="lease_2",
            org_id="org_mock_123",
            unit_id="unit_oak_a",
            status="active",
            start_date=date(2025, 6, 1),
            end_date=date(2026, 5, 31),
            rent_amount_cents=280000,
            deposit_amount_cents=280000,
            late_fee_type="percentage",
            late_fee_value_cents=500,
            grace_period_days=5
        )
        lease2.tenants.append(t2)
        
        db.add_all([lease1, lease2])
        db.commit()

        print("Seeding Payments...")
        p1 = models.Payment(
            id="pay_1",
            org_id="org_mock_123",
            lease_id="lease_1",
            amount_cents=180000,
            method="ach",
            status="succeeded",
            due_date=date(2026, 1, 1),
            paid_at=datetime(2026, 1, 2, 10, 0, 0)
        )
        p2 = models.Payment(
            id="pay_2",
            org_id="org_mock_123",
            lease_id="lease_1",
            amount_cents=180000,
            method="ach",
            status="succeeded",
            due_date=date(2026, 2, 1),
            paid_at=datetime(2026, 2, 1, 9, 30, 0)
        )
        p3 = models.Payment(
            id="pay_3",
            org_id="org_mock_123",
            lease_id="lease_1",
            amount_cents=180000,
            method="ach",
            status="succeeded",
            due_date=date(2026, 3, 1),
            paid_at=datetime(2026, 3, 1, 14, 15, 0)
        )
        # Outstanding rent payment
        p4 = models.Payment(
            id="pay_4",
            org_id="org_mock_123",
            lease_id="lease_1",
            amount_cents=180000,
            method="ach",
            status="pending",
            due_date=date(2026, 7, 1)
        )
        db.add_all([p1, p2, p3, p4])
        db.commit()

        print("Seeding Vacancy Applications...")
        app1 = models.Application(
            id="app_1",
            org_id="org_mock_123",
            unit_id="unit_102",
            first_name="Charlie",
            last_name="Brown",
            email="charlie@example.com",
            phone="512-555-0188",
            income_cents=7500000,
            status="screening_pending",
            credit_score=710,
            criminal_background="No criminal records identified",
            eviction_history="No evictions flagged",
            screening_report_url="https://screening-reports.ledgerly.local/report_app_1.pdf"
        )
        app2 = models.Application(
            id="app_2",
            org_id="org_mock_123",
            unit_id="unit_102",
            first_name="Dana",
            last_name="Scully",
            email="scully@fbi.gov",
            phone="202-555-0111",
            income_cents=9500000,
            status="submitted"
        )
        db.add_all([app1, app2])
        db.commit()

        print("Seeding Dispatched Vendors...")
        v1 = models.Vendor(
            id="vendor_1",
            org_id="org_mock_123",
            name="Austin Plumbing Crew",
            contact_name="Mario",
            email="mario@austinplumbing.local",
            phone="512-555-9000",
            category="plumbing"
        )
        v2 = models.Vendor(
            id="vendor_2",
            org_id="org_mock_123",
            name="Air Care HVAC Experts",
            contact_name="Sarah",
            email="sarah@aircare.local",
            phone="512-555-9111",
            category="hvac"
        )
        db.add_all([v1, v2])
        db.commit()

        print("Seeding Maintenance Requests...")
        req1 = models.MaintenanceRequest(
            id="req_1",
            org_id="org_mock_123",
            unit_id="unit_103",
            tenant_id="tenant_1",
            category="plumbing",
            priority="high",
            status="assigned",
            description="Water leaking slowly from the bottom of the garbage disposal inside the sink cabinet.",
            vendor_id="vendor_1"
        )
        req2 = models.MaintenanceRequest(
            id="req_2",
            org_id="org_mock_123",
            unit_id="unit_101",
            tenant_id="tenant_1",
            category="hvac",
            priority="emergency",
            status="in_progress",
            description="AC unit is blowing warm air. Indoor temperature is currently 83 degrees.",
            vendor_id="vendor_2"
        )
        db.add_all([req1, req2])
        db.commit()

        print("Seeding Trust Ledger Accounts...")
        e1 = models.TrustLedgerEntry(
            id="trust_1",
            org_id="org_mock_123",
            property_id="prop_1",
            owner_id="owner_1",
            type="security_hold",
            amount_cents=180000,
            reference_id="dep_lease_1"
        )
        e2 = models.TrustLedgerEntry(
            id="trust_2",
            org_id="org_mock_123",
            property_id="prop_1",
            owner_id="owner_1",
            type="rent_received",
            amount_cents=180000,
            reference_id="pay_1"
        )
        e3 = models.TrustLedgerEntry(
            id="trust_3",
            org_id="org_mock_123",
            property_id="prop_1",
            owner_id="owner_1",
            type="rent_received",
            amount_cents=180000,
            reference_id="pay_2"
        )
        e4 = models.TrustLedgerEntry(
            id="trust_4",
            org_id="org_mock_123",
            property_id="prop_1",
            owner_id="owner_1",
            type="rent_received",
            amount_cents=180000,
            reference_id="pay_3"
        )
        # Deduct payout
        e5 = models.TrustLedgerEntry(
            id="trust_5",
            org_id="org_mock_123",
            property_id="prop_1",
            owner_id="owner_1",
            type="payout",
            amount_cents=-400000,
            reference_id="po_mock_arthur_1"
        )
        # Deduct PM fee (10% PM fee)
        e6 = models.TrustLedgerEntry(
            id="trust_6",
            org_id="org_mock_123",
            property_id="prop_1",
            owner_id="owner_1",
            type="pm_fee",
            amount_cents=-40000,
            reference_id="fee_mock_arthur_1"
        )
        db.add_all([e1, e2, e3, e4, e5, e6])
        db.commit()

        print("Database seeded successfully with sample demo parameters!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
