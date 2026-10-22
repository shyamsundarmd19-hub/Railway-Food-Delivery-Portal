import uuid
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import Order, OrderItem, FoodMenu, Station, User, OrderStatus
from app.schemas.schemas import OrderCreate, OrderOut, OrderItemOut, OrderStatusUpdate
from app.services.email import email_service

router = APIRouter(prefix="/orders", tags=["Station-to-Seat Orders"])


def _format_order_out(order: Order) -> OrderOut:
    """Helper to convert Order ORM model into OrderOut schema with items."""
    items_out = []
    for it in order.order_items:
        items_out.append(
            OrderItemOut(
                id=it.id,
                order_id=it.order_id,
                menu_id=it.menu_id,
                item_name=it.menu_item.item_name if it.menu_item else "Item",
                quantity=it.quantity,
                unit_price=it.unit_price,
                total_price=round(it.quantity * it.unit_price, 2),
            )
        )

    return OrderOut(
        id=order.id,
        user_id=order.user_id,
        passenger_name=order.passenger.name if order.passenger else None,
        passenger_phone=order.passenger.phone if order.passenger else None,
        vendor_id=order.vendor_id,
        vendor_name=order.vendor.name if order.vendor else None,
        train_number=order.train_number,
        coach_number=order.coach_number,
        seat_number=order.seat_number,
        station_id=order.station_id,
        station_code=order.station.station_code if order.station else None,
        station_name=order.station.station_name if order.station else None,
        total_amount=order.total_amount,
        payment_status=order.payment_status,
        status=order.status,
        created_at=order.created_at,
        items=items_out,
    )


@router.post("/", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def place_order(
    order_in: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Passenger: Place a new meal delivery order to your train berth.
    - Validates vendor and item availability
    - Computes total cost from verified unit prices
    - Persists order & itemized lines
    - Triggers AWS SES digital invoice dispatch
    """
    if not order_in.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must contain at least one menu item.",
        )

    # Verify station exists
    station = db.query(Station).filter(Station.id == order_in.station_id).first()
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery station not found.",
        )

    # Verify vendor exists
    vendor = db.query(User).filter(User.id == order_in.vendor_id, User.role == "vendor").first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected vendor not found or not active.",
        )

    # Calculate total and validate items
    total_amount = 0.0
    items_to_persist = []
    email_items = []

    for item_req in order_in.items:
        menu_item = db.query(FoodMenu).filter(
            FoodMenu.id == item_req.menu_id,
            FoodMenu.vendor_id == vendor.id,
            FoodMenu.is_available == True,
        ).first()

        if not menu_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Menu item #{item_req.menu_id} is unavailable or does not belong to this vendor.",
            )

        line_total = menu_item.price * item_req.quantity
        total_amount += line_total

        order_item = OrderItem(
            menu_id=menu_item.id,
            quantity=item_req.quantity,
            unit_price=menu_item.price,
        )
        items_to_persist.append(order_item)
        email_items.append({
            "name": menu_item.item_name,
            "quantity": item_req.quantity,
            "unit_price": menu_item.price,
        })

    new_order = Order(
        user_id=current_user.id,
        vendor_id=vendor.id,
        train_number=order_in.train_number.strip(),
        coach_number=order_in.coach_number.strip().upper(),
        seat_number=order_in.seat_number.strip(),
        station_id=station.id,
        total_amount=round(total_amount, 2),
        payment_status="PAID",
        status=OrderStatus.ORDERED.value,
    )
    new_order.order_items = items_to_persist

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    # Trigger asynchronous AWS SES email notification with invoice
    email_service.send_order_placed_invoice(
        to_email=current_user.email,
        passenger_name=current_user.name,
        order_id=str(new_order.id),
        train_number=new_order.train_number,
        coach_number=new_order.coach_number,
        seat_number=new_order.seat_number,
        station_name=station.station_name,
        items=email_items,
        total_amount=new_order.total_amount,
    )

    return _format_order_out(new_order)


@router.get("/", response_model=List[OrderOut])
def get_passenger_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Passenger: Retrieve personal order history.
    """
    orders = db.query(Order).filter(
        Order.user_id == current_user.id
    ).order_by(Order.created_at.desc()).all()

    return [_format_order_out(o) for o in orders]


@router.get("/vendor", response_model=List[OrderOut])
def get_vendor_orders(
    current_user: User = Depends(require_role("vendor", "admin")),
    db: Session = Depends(get_db),
):
    """
    Vendor: Retrieve all incoming and past meal delivery orders assigned to this restaurant.
    """
    query = db.query(Order)
    if current_user.role == "vendor":
        query = query.filter(Order.vendor_id == current_user.id)

    orders = query.order_by(Order.created_at.desc()).all()
    return [_format_order_out(o) for o in orders]


@router.put("/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: uuid.UUID,
    status_update: OrderStatusUpdate,
    current_user: User = Depends(require_role("vendor", "admin")),
    db: Session = Depends(get_db),
):
    """
    Vendor: Update order delivery lifecycle.
    Lifecycle stages: ordered -> preparing -> out_for_delivery -> delivered (or cancelled).
    Triggers AWS SES notification email to passenger.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    # Authorization check
    if current_user.role == "vendor" and order.vendor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to modify this order.",
        )

    valid_statuses = [
        OrderStatus.ORDERED.value,
        OrderStatus.PREPARING.value,
        OrderStatus.OUT_FOR_DELIVERY.value,
        OrderStatus.DELIVERED.value,
        OrderStatus.CANCELLED.value,
    ]
    target_status = status_update.status.lower().strip()
    if target_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{target_status}'. Must be one of: {valid_statuses}",
        )

    order.status = target_status
    db.commit()
    db.refresh(order)

    # Send AWS SES status notification
    if order.passenger:
        email_service.send_order_status_update(
            to_email=order.passenger.email,
            passenger_name=order.passenger.name,
            order_id=str(order.id),
            new_status=order.status,
            train_number=order.train_number,
            coach_number=order.coach_number,
            seat_number=order.seat_number,
            station_name=order.station.station_name if order.station else "Railway Station",
        )

    return _format_order_out(order)


@router.get("/{order_id}/invoice.pdf")
def download_tax_invoice_pdf(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate and stream a tax invoice PDF via ReportLab."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if current_user.role == "passenger" and order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")

    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    p.setFont("Helvetica-Bold", 16)
    p.drawString(50, 750, "RailFood - Station-to-Seat Railway Catering")
    p.setFont("Helvetica", 10)
    p.drawString(50, 735, "Tax Invoice / Delivery Receipt (AWS Free Tier Infrastructure)")
    p.line(50, 725, 550, 725)

    p.drawString(50, 700, f"Order Ref: {str(order.id)}")
    p.drawString(350, 700, f"Date: {order.created_at.strftime('%Y-%m-%d %H:%M')}")
    p.drawString(50, 680, f"Passenger: {order.passenger.name} ({order.passenger.phone})")
    p.drawString(50, 665, f"Train: {order.train_number} | Delivery Berth: Coach {order.coach_number}, Seat {order.seat_number}")
    p.drawString(50, 650, f"Station: {order.station.station_name} ({order.station.station_code})")
    p.drawString(350, 650, f"Status: {order.status.upper()}")

    p.line(50, 635, 550, 635)
    p.setFont("Helvetica-Bold", 10)
    p.drawString(50, 620, "Item")
    p.drawString(350, 620, "Qty")
    p.drawString(420, 620, "Price")
    p.drawString(490, 620, "Total")
    p.line(50, 610, 550, 610)

    p.setFont("Helvetica", 10)
    y = 590
    for item in order.order_items:
        p.drawString(50, y, item.menu_item.item_name[:35] if item.menu_item else "Meal")
        p.drawString(350, y, str(item.quantity))
        p.drawString(420, y, f"Rs. {item.unit_price:.2f}")
        p.drawString(490, y, f"Rs. {(item.quantity * item.unit_price):.2f}")
        y -= 20

    p.line(50, y + 10, 550, y + 10)
    p.setFont("Helvetica-Bold", 12)
    p.drawString(350, y - 5, "Total Amount:")
    p.drawString(490, y - 5, f"Rs. {order.total_amount:.2f}")

    p.showPage()
    p.save()
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice_{str(order.id)[:8]}.pdf"},
    )
