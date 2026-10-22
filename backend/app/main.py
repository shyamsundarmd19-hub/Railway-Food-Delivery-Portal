import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.security import get_password_hash
from app.models.models import User, Train, Station, FoodMenu, UserRole
from app.routers import (
    auth_router,
    trains_router,
    menu_router,
    orders_router,
    documents_router,
    admin_router,
)


def seed_initial_data(db: Session):
    """Seed initial railway stations, trains, and demo users if database is empty."""
    try:
        # 1. Seed Stations
        if db.query(Station).count() == 0:
            stations = [
                Station(station_code="NDLS", station_name="New Delhi Railway Station", city="New Delhi"),
                Station(station_code="BCT", station_name="Mumbai Central", city="Mumbai"),
                Station(station_code="MAS", station_name="MGR Chennai Central", city="Chennai"),
                Station(station_code="HWH", station_name="Howrah Junction", city="Kolkata"),
                Station(station_code="SBC", station_name="KSR Bengaluru City", city="Bengaluru"),
                Station(station_code="PNBE", station_name="Patna Junction", city="Patna"),
            ]
            db.add_all(stations)
            db.commit()
            print("[OK] Seeded major Indian Railways stations.")

        # 2. Seed Trains
        if db.query(Train).count() == 0:
            trains = [
                Train(train_number="12301", train_name="Howrah Rajdhani Express", source="HWH", destination="NDLS"),
                Train(train_number="12951", train_name="Mumbai Tejas Rajdhani", source="BCT", destination="NDLS"),
                Train(train_number="22436", train_name="Vande Bharat Express", source="NDLS", destination="BSB"),
                Train(train_number="12622", train_name="Tamil Nadu Express", source="NDLS", destination="MAS"),
            ]
            db.add_all(trains)
            db.commit()
            print("[OK] Seeded express trains.")

        # 3. Seed Default Admin & Vendor Users
        admin_user = db.query(User).filter(User.email == "admin@railfood.app").first()
        if not admin_user:
            admin_user = User(
                name="RailFood Administrator",
                email="admin@railfood.app",
                phone="+919999900001",
                role=UserRole.ADMIN.value,
                password_hash=get_password_hash("AdminPass123!"),
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

        vendor_user = db.query(User).filter(User.email == "vendor@railfood.app").first()
        if not vendor_user:
            vendor_user = User(
                name="Bikanervala Express Caterers",
                email="vendor@railfood.app",
                phone="+919999900002",
                role=UserRole.VENDOR.value,
                password_hash=get_password_hash("VendorPass123!"),
            )
            db.add(vendor_user)
            db.commit()
            db.refresh(vendor_user)

        # 4. Seed Sample Menu Items
        if db.query(FoodMenu).count() == 0 and vendor_user:
            ndls = db.query(Station).filter(Station.station_code == "NDLS").first()
            bct = db.query(Station).filter(Station.station_code == "BCT").first()
            if ndls:
                menu_items = [
                    FoodMenu(
                        vendor_id=vendor_user.id,
                        station_id=ndls.id,
                        item_name="Royal Maharaja Thali",
                        category="veg",
                        price=249.0,
                        photo_url="menu-photos/royal_thali.jpg",
                        is_available=True,
                    ),
                    FoodMenu(
                        vendor_id=vendor_user.id,
                        station_id=ndls.id,
                        item_name="Dum Handi Biryani Box",
                        category="non-veg",
                        price=289.0,
                        photo_url="menu-photos/dum_biryani.jpg",
                        is_available=True,
                    ),
                    FoodMenu(
                        vendor_id=vendor_user.id,
                        station_id=ndls.id,
                        item_name="Ginger Cardamom Chai Flask (500ml)",
                        category="beverages",
                        price=120.0,
                        photo_url="menu-photos/chai_flask.jpg",
                        is_available=True,
                    ),
                ]
                if bct:
                    menu_items.append(
                        FoodMenu(
                            vendor_id=vendor_user.id,
                            station_id=bct.id,
                            item_name="Jain Satvik Special Thali",
                            category="veg",
                            price=210.0,
                            photo_url="menu-photos/jain_thali.jpg",
                            is_available=True,
                        )
                    )
                db.add_all(menu_items)
                db.commit()
                print("[OK] Seeded sample menu items.")
    except Exception as e:
        db.rollback()
        print(f"Seed note: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables automatically on startup
    try:
        Base.metadata.create_all(bind=engine)
        print("[OK] Database schema synchronized successfully.")
        db = SessionLocal()
        try:
            seed_initial_data(db)
        finally:
            db.close()
    except Exception as e:
        print(f"Database initialization note: {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="RailFood Station-to-Seat Railway Catering Backend (AWS Free Tier: EC2, RDS PostgreSQL, S3 SSE-S3 & SES).",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "endpoints": {
            "auth": f"{settings.API_V1_STR}/auth",
            "trains": f"{settings.API_V1_STR}/trains",
            "menu": f"{settings.API_V1_STR}/menu",
            "orders": f"{settings.API_V1_STR}/orders",
            "documents": f"{settings.API_V1_STR}/documents",
            "admin": f"{settings.API_V1_STR}/admin",
        },
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "timestamp": "live"}


# Register all API routers under /api
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(trains_router, prefix=settings.API_V1_STR)
app.include_router(menu_router, prefix=settings.API_V1_STR)
app.include_router(orders_router, prefix=settings.API_V1_STR)
app.include_router(documents_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
