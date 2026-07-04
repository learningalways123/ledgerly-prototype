import logging
from datetime import date, timedelta
from app.tasks.celery_app import celery_app
from app.core.db import SessionLocal
from app.models import database as models

logger = logging.getLogger("rent_tasks")

@celery_app.task(name="app.tasks.rent_tasks.check_late_payments")
def check_late_payments():
    """
    Daily cron task that scans active leases, identifies late rent payments,
    and automatically applies late fees based on lease configuration.
    """
    db = SessionLocal()
    try:
        today = date.today()
        # Find all active leases
        active_leases = db.query(models.Lease).filter(
            models.Lease.status == "active",
            models.Lease.start_date <= today,
            models.Lease.end_date >= today
        ).all()

        for lease in active_leases:
            # Check if rent was paid for the current month
            first_of_month = date(today.year, today.month, 1)
            
            # Find if there is an active payment covering this month's rent
            rent_payment = db.query(models.Payment).filter(
                models.Payment.lease_id == lease.id,
                models.Payment.due_date >= first_of_month,
                models.Payment.due_date <= today,
                models.Payment.status == "succeeded"
            ).first()

            if not rent_payment:
                # Rent is unpaid. Check if grace period has expired.
                # Standard rent due date is 1st of the month
                rent_due_date = date(today.year, today.month, 1)
                grace_period_expiry = rent_due_date + timedelta(days=lease.grace_period_days)

                if today > grace_period_expiry:
                    # Grace period expired! Check if we already applied a late fee this month
                    already_applied = db.query(models.Payment).filter(
                        models.Payment.lease_id == lease.id,
                        models.Payment.due_date == rent_due_date,
                        models.Payment.late_fee_applied_cents > 0
                    ).first()

                    if not already_applied:
                        # Determine late fee amount
                        late_fee = 0
                        if lease.late_fee_type == "flat":
                            late_fee = lease.late_fee_value_cents
                        elif lease.late_fee_type == "percentage":
                            late_fee = int((lease.rent_amount_cents * lease.late_fee_value_cents) / 10000)

                        if late_fee > 0:
                            logger.info(f"Applying late fee of {late_fee} cents to lease {lease.id}")
                            
                            # Create a late fee payment entry
                            fee_payment = models.Payment(
                                org_id=lease.org_id,
                                lease_id=lease.id,
                                amount_cents=late_fee,
                                currency="usd",
                                method="ach",
                                status="pending",
                                late_fee_applied_cents=late_fee,
                                due_date=rent_due_date
                            )
                            db.add(fee_payment)
                            db.commit()
    except Exception as e:
        logger.error(f"Error checking late payments: {str(e)}")
    finally:
        db.close()
