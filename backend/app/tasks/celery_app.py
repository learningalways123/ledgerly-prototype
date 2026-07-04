from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "ledgerly_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # In test/dev environments without a Redis container, Celery tasks can run eagerly (synchronously)
    task_always_eager=False 
)

# Discover tasks automatically in app.tasks.rent_tasks
celery_app.autodiscover_tasks(["app.tasks.rent_tasks"])
