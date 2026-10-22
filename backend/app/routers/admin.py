from typing import List, Dict
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role
from app.models.models import Order, Station, User, OrderStatus
from app.schemas.schemas import AnalyticsOut, StationSalesStat

router = APIRouter(prefix="/admin", tags=["Admin & Analytics"])


@router.get("/analytics", response_model=AnalyticsOut)
def get_analytics(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """
    Admin-only: Aggregate real-time sales and order performance metrics across all stations.
    - Total revenue
    - Total orders & status breakdown
    - Top performing delivery stations
    - Active vendor & passenger counts
    """
    # 1. Total revenue & count
    total_revenue_res = db.query(func.coalesce(func.sum(Order.total_amount), 0.0)).filter(
        Order.status != OrderStatus.CANCELLED.value
    ).scalar()
    total_revenue = float(total_revenue_res or 0.0)

    total_orders = db.query(func.count(Order.id)).scalar() or 0
    completed_orders = db.query(func.count(Order.id)).filter(
        Order.status == OrderStatus.DELIVERED.value
    ).scalar() or 0

    cancelled_orders = db.query(func.count(Order.id)).filter(
        Order.status == OrderStatus.CANCELLED.value
    ).scalar() or 0

    active_orders = db.query(func.count(Order.id)).filter(
        Order.status.in_([
            OrderStatus.ORDERED.value,
            OrderStatus.PREPARING.value,
            OrderStatus.OUT_FOR_DELIVERY.value,
        ])
    ).scalar() or 0

    # 2. User metrics
    total_customers = db.query(func.count(User.id)).filter(User.role == "passenger").scalar() or 0
    total_vendors = db.query(func.count(User.id)).filter(User.role == "vendor").scalar() or 0

    # 3. Top selling stations
    station_stats = (
        db.query(
            Station.id,
            Station.station_code,
            Station.station_name,
            Station.city,
            func.count(Order.id).label("order_count"),
            func.coalesce(func.sum(Order.total_amount), 0.0).label("total_sales"),
        )
        .join(Order, Order.station_id == Station.id)
        .filter(Order.status != OrderStatus.CANCELLED.value)
        .group_by(Station.id, Station.station_code, Station.station_name, Station.city)
        .order_by(func.sum(Order.total_amount).desc())
        .limit(10)
        .all()
    )

    top_stations = [
        StationSalesStat(
            station_id=row.id,
            station_code=row.station_code,
            station_name=row.station_name,
            city=row.city,
            order_count=row.order_count,
            total_sales=float(row.total_sales or 0.0),
        )
        for row in station_stats
    ]

    # If no orders yet, populate empty list or top stations without orders
    if not top_stations:
        stations = db.query(Station).limit(5).all()
        top_stations = [
            StationSalesStat(
                station_id=s.id,
                station_code=s.station_code,
                station_name=s.station_name,
                city=s.city,
                order_count=0,
                total_sales=0.0,
            )
            for s in stations
        ]

    # 4. Status breakdown dictionary
    statuses = db.query(Order.status, func.count(Order.id)).group_by(Order.status).all()
    status_breakdown = {s: count for s, count in statuses}

    return AnalyticsOut(
        total_revenue=round(total_revenue, 2),
        total_orders=total_orders,
        completed_orders=completed_orders,
        active_orders=active_orders,
        cancelled_orders=cancelled_orders,
        total_customers=total_customers,
        total_vendors=total_vendors,
        top_selling_stations=top_stations,
        status_breakdown=status_breakdown,
    )
