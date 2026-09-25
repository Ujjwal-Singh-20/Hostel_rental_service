from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.items import router as items_router
from app.api.rentals import router as rentals_router
from app.api.chat import router as chat_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(items_router)
api_router.include_router(rentals_router)
api_router.include_router(chat_router)

__all__ = ["api_router"]
