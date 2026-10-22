from app.routers.auth import router as auth_router
from app.routers.trains import router as trains_router
from app.routers.menu import router as menu_router
from app.routers.orders import router as orders_router
from app.routers.documents import router as documents_router
from app.routers.admin import router as admin_router

__all__ = [
    "auth_router",
    "trains_router",
    "menu_router",
    "orders_router",
    "documents_router",
    "admin_router",
]
