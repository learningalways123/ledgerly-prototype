import logging
import stripe
from app.core.config import settings

logger = logging.getLogger("stripe_service")

# Setup stripe API key
stripe.api_key = settings.STRIPE_SECRET_KEY

class StripeService:
    @staticmethod
    def create_customer(email: str, name: str) -> str:
        """
        Creates a Stripe customer. If key is mock, returns a placeholder customer ID.
        """
        if settings.STRIPE_SECRET_KEY == "sk_test_placeholder":
            logger.info("Mock Stripe environment. Generating mock customer ID.")
            return "cus_mock_" + email.split("@")[0]
        
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name
            )
            return customer.id
        except Exception as e:
            logger.error(f"Error creating Stripe customer: {str(e)}")
            raise

    @staticmethod
    def create_payment_intent(amount_cents: int, customer_id: str, connect_account_id: str = None) -> dict:
        """
        Creates a Stripe payment intent. Supports direct destination transfers if connect_account_id is provided.
        """
        if settings.STRIPE_SECRET_KEY == "sk_test_placeholder":
            logger.info("Mock Stripe environment. Generating mock PaymentIntent.")
            return {
                "id": "pi_mock_" + stripe.api_key[:10],
                "client_secret": "pi_mock_secret_" + stripe.api_key[:10],
                "amount": amount_cents,
                "status": "requires_payment_method"
            }

        try:
            intent_args = {
                "amount": amount_cents,
                "currency": "usd",
                "customer": customer_id,
                "payment_method_types": ["us_bank_account", "card"],
            }

            # If Stripe Connect account is designated (Phase 3 path prepared in Phase 1)
            if connect_account_id:
                intent_args["transfer_data"] = {
                    "destination": connect_account_id
                }

            intent = stripe.PaymentIntent.create(**intent_args)
            return {
                "id": intent.id,
                "client_secret": intent.client_secret,
                "amount": intent.amount,
                "status": intent.status
            }
        except Exception as e:
            logger.error(f"Error creating PaymentIntent: {str(e)}")
            raise

    @staticmethod
    def construct_webhook_event(payload: bytes, sig_header: str) -> stripe.Event:
        """
        Validates webhook signatures from Stripe. Falls back to manual parsing if secret is placeholder.
        """
        if settings.STRIPE_WEBHOOK_SECRET == "whsec_placeholder":
            logger.info("Mock Stripe environment. Constructing mock stripe event.")
            import json
            data = json.loads(payload.decode("utf-8"))
            return stripe.Event.construct_from(data, stripe.api_key)
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
            return event
        except Exception as e:
            logger.error(f"Error validating stripe webhook: {str(e)}")
            raise
