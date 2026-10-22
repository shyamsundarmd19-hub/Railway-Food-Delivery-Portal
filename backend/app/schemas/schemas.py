import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field


# ------------------------------------------------------------------------------
# User & Auth Schemas
# ------------------------------------------------------------------------------
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(..., min_length=8, max_length=20)
    password: str = Field(..., min_length=6)
    role: str = Field(default="passenger", description="passenger, vendor, or admin")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    phone: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: uuid.UUID
    name: str


# ------------------------------------------------------------------------------
# Train & Station Schemas
# ------------------------------------------------------------------------------
class TrainCreate(BaseModel):
    train_number: str
    train_name: str
    source: str
    destination: str


class TrainOut(BaseModel):
    id: int
    train_number: str
    train_name: str
    source: str
    destination: str

    class Config:
        from_attributes = True


class StationCreate(BaseModel):
    station_code: str
    station_name: str
    city: str


class StationOut(BaseModel):
    id: int
    station_code: str
    station_name: str
    city: str

    class Config:
        from_attributes = True


class TrainWithStationsOut(BaseModel):
    train: TrainOut
    upcoming_stations: List[StationOut]


# ------------------------------------------------------------------------------
# Food Menu Schemas
# ------------------------------------------------------------------------------
class FoodMenuCreate(BaseModel):
    station_id: int
    item_name: str
    category: str = Field(default="veg", description="veg, non-veg, or beverages")
    price: float = Field(..., gt=0)
    photo_url: Optional[str] = None
    is_available: bool = True


class FoodMenuOut(BaseModel):
    id: int
    vendor_id: uuid.UUID
    station_id: int
    item_name: str
    category: str
    price: float
    photo_url: Optional[str] = None
    is_available: bool
    station_name: Optional[str] = None
    station_code: Optional[str] = None
    vendor_name: Optional[str] = None

    class Config:
        from_attributes = True


# ------------------------------------------------------------------------------
# Order & Order Item Schemas
# ------------------------------------------------------------------------------
class OrderItemCreate(BaseModel):
    menu_id: int
    quantity: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    vendor_id: uuid.UUID
    train_number: str
    coach_number: str
    seat_number: str
    station_id: int
    items: List[OrderItemCreate]


class OrderItemOut(BaseModel):
    id: int
    order_id: uuid.UUID
    menu_id: int
    item_name: Optional[str] = None
    quantity: int
    unit_price: float
    total_price: float = 0.0

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    passenger_name: Optional[str] = None
    passenger_phone: Optional[str] = None
    vendor_id: uuid.UUID
    vendor_name: Optional[str] = None
    train_number: str
    coach_number: str
    seat_number: str
    station_id: int
    station_code: Optional[str] = None
    station_name: Optional[str] = None
    total_amount: float
    payment_status: str
    status: str
    created_at: datetime
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., description="ordered, preparing, out_for_delivery, delivered, cancelled")


# ------------------------------------------------------------------------------
# S3 Presigned URL Schemas
# ------------------------------------------------------------------------------
class S3UploadUrlRequest(BaseModel):
    filename: str
    content_type: str = "image/jpeg"
    folder: str = "menu-photos"


class S3UploadUrlResponse(BaseModel):
    upload_url: str
    s3_key: str
    file_url: str
    expires_in_seconds: int = 3600


# ------------------------------------------------------------------------------
# Admin Analytics Schemas
# ------------------------------------------------------------------------------
class StationSalesStat(BaseModel):
    station_id: int
    station_code: str
    station_name: str
    city: str
    order_count: int
    total_sales: float


class AnalyticsOut(BaseModel):
    total_revenue: float
    total_orders: int
    completed_orders: int
    active_orders: int
    cancelled_orders: int
    total_customers: int
    total_vendors: int
    top_selling_stations: List[StationSalesStat]
    status_breakdown: Dict[str, int]
