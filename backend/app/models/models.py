import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Enum,
    Text,
    Uuid,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class UserRole(str, enum.Enum):
    PASSENGER = "passenger"
    VENDOR = "vendor"
    ADMIN = "admin"


class FoodCategory(str, enum.Enum):
    VEG = "veg"
    NON_VEG = "non-veg"
    BEVERAGES = "beverages"


class OrderStatus(str, enum.Enum):
    ORDERED = "ordered"
    PREPARING = "preparing"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class User(Base):
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    phone = Column(String(20), unique=True, index=True, nullable=False)
    role = Column(String(20), default=UserRole.PASSENGER.value, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    food_menu_items = relationship(
        "FoodMenu", back_populates="vendor", cascade="all, delete-orphan", foreign_keys="FoodMenu.vendor_id"
    )
    passenger_orders = relationship(
        "Order", back_populates="passenger", foreign_keys="Order.user_id"
    )
    vendor_orders = relationship(
        "Order", back_populates="vendor", foreign_keys="Order.vendor_id"
    )


class Train(Base):
    __tablename__ = "trains"

    id = Column(Integer, primary_key=True, index=True)
    train_number = Column(String(20), unique=True, index=True, nullable=False)
    train_name = Column(String(120), nullable=False)
    source = Column(String(100), nullable=False)
    destination = Column(String(100), nullable=False)


class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, index=True)
    station_code = Column(String(10), unique=True, index=True, nullable=False)  # e.g., NDLS, BCT
    station_name = Column(String(120), nullable=False)
    city = Column(String(100), nullable=False)

    # Relationships
    food_menu_items = relationship("FoodMenu", back_populates="station", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="station")


class FoodMenu(Base):
    __tablename__ = "food_menu"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    station_id = Column(Integer, ForeignKey("stations.id", ondelete="CASCADE"), nullable=False, index=True)
    item_name = Column(String(150), nullable=False)
    category = Column(String(30), default=FoodCategory.VEG.value, nullable=False)
    price = Column(Float, nullable=False)
    photo_url = Column(String(255), nullable=True)  # S3 key or presigned/CDN URL
    is_available = Column(Boolean, default=True, nullable=False)

    # Relationships
    vendor = relationship("User", back_populates="food_menu_items", foreign_keys=[vendor_id])
    station = relationship("Station", back_populates="food_menu_items")
    order_items = relationship("OrderItem", back_populates="menu_item")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    train_number = Column(String(20), nullable=False, index=True)
    coach_number = Column(String(10), nullable=False)  # e.g., B2, S3
    seat_number = Column(String(10), nullable=False)   # e.g., 42
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False, index=True)
    total_amount = Column(Float, nullable=False)
    payment_status = Column(String(30), default="PAID", nullable=False)
    status = Column(String(30), default=OrderStatus.ORDERED.value, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    passenger = relationship("User", back_populates="passenger_orders", foreign_keys=[user_id])
    vendor = relationship("User", back_populates="vendor_orders", foreign_keys=[vendor_id])
    station = relationship("Station", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Uuid, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    menu_id = Column(Integer, ForeignKey("food_menu.id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Float, nullable=False)

    # Relationships
    order = relationship("Order", back_populates="order_items")
    menu_item = relationship("FoodMenu", back_populates="order_items")
