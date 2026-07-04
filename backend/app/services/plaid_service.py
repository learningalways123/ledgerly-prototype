import logging
import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from app.core.config import settings

logger = logging.getLogger("plaid_service")

class PlaidService:
    @staticmethod
    def get_client():
        """
        Initializes Plaid API Client. If credentials are not set, returns None.
        """
        if not settings.PLAID_CLIENT_ID or not settings.PLAID_SECRET:
            return None
        
        configuration = plaid.Configuration(
            host=plaid.Environment.Sandbox if settings.PLAID_ENV == "sandbox" else plaid.Environment.Development,
            api_key={
                'plaidClientId': settings.PLAID_CLIENT_ID,
                'secret': settings.PLAID_SECRET,
            }
        )
        api_client = plaid.ApiClient(configuration)
        return plaid_api.PlaidApi(api_client)

    @staticmethod
    def create_link_token(user_id: str, client_name: str = "Ledgerly") -> str:
        """
        Creates a link token for Plaid Link flow. Falls back to mock token if client is none.
        """
        client = PlaidService.get_client()
        if not client:
            logger.info("Mock Plaid environment. Returning mock link token.")
            return "link-sandbox-mock-12345"

        try:
            request = LinkTokenCreateRequest(
                products=[Products('auth')],
                client_name=client_name,
                country_codes=[CountryCode('US')],
                language='en',
                user=LinkTokenCreateRequestUser(client_user_id=user_id)
            )
            response = client.link_token_create(request)
            return response['link_token']
        except Exception as e:
            logger.error(f"Error creating Plaid Link Token: {str(e)}")
            raise

    @staticmethod
    def exchange_public_token(public_token: str) -> dict:
        """
        Exchanges a public token for an access token and item ID.
        """
        client = PlaidService.get_client()
        if not client or public_token.startswith("public-sandbox-mock"):
            logger.info("Mock Plaid environment. Exchanging mock public token.")
            return {
                "access_token": "access-sandbox-mock-123",
                "item_id": "item-mock-123"
            }

        try:
            request = ItemPublicTokenExchangeRequest(
                public_token=public_token
            )
            response = client.item_public_token_exchange(request)
            return {
                "access_token": response['access_token'],
                "item_id": response['item_id']
            }
        except Exception as e:
            logger.error(f"Error exchanging public token: {str(e)}")
            raise
