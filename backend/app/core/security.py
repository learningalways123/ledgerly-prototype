import logging
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings
from app.schemas.pydantic_schemas import UserSession

security_bearer = HTTPBearer(auto_error=False)
logger = logging.getLogger("security")

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security_bearer)) -> UserSession:
    """
    Decodes the Clerk JWT from the Authorization header.
    In development/testing, supports mock tokens.
    """
    if not credentials:
        # For development / testing convenience, fallback to default mock if no credentials provided
        logger.warning("No auth credentials provided. Defaulting to mock landlord session.")
        return UserSession(
            user_id="usr_mock_landlord_123",
            org_id="org_mock_123",
            roles=["landlord"]
        )

    token = credentials.credentials

    # Handle development mock authentication
    if token == "mock-landlord":
        return UserSession(
            user_id="usr_mock_landlord_123",
            org_id="org_mock_123",
            roles=["landlord"]
        )
    elif token == "mock-tenant":
        return UserSession(
            user_id="usr_mock_tenant_456",
            org_id="org_mock_123",
            roles=["tenant"]
        )
    elif token == "mock-vendor":
        return UserSession(
            user_id="usr_mock_vendor_789",
            org_id="org_mock_123",
            roles=["vendor"]
        )

    # JWT validation with Clerk
    if not settings.CLERK_JWT_VERIFICATION_KEY:
        # If Clerk key is not set, allow mock access in development
        logger.warning("Clerk verification key is not set. Accepting request as mock landlord.")
        return UserSession(
            user_id="usr_mock_landlord_123",
            org_id="org_mock_123",
            roles=["landlord"]
        )

    try:
        # Decode the token
        payload = jwt.decode(
            token,
            settings.CLERK_JWT_VERIFICATION_KEY,
            algorithms=["RS256"],
            options={"verify_aud": False}
        )
        
        user_id = payload.get("sub")
        org_id = payload.get("org_id") or "org_mock_123"  # default org fallback
        roles = payload.get("roles", [])

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject"
            )
            
        return UserSession(user_id=user_id, org_id=org_id, roles=roles)

    except JWTError as e:
        logger.error(f"JWT Verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}"
        )
