from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_role
from app.models.models import FoodMenu, Station, User
from app.schemas.schemas import FoodMenuCreate, FoodMenuOut

router = APIRouter(prefix="/menu", tags=["Food Menu"])


@router.get("/", response_model=List[FoodMenuOut])
def get_menu(
    station_id: Optional[int] = Query(None, description="Filter meals available at specific station"),
    category: Optional[str] = Query(None, description="veg, non-veg, or beverages"),
    is_available: bool = Query(True, description="Filter available items only"),
    db: Session = Depends(get_db),
):
    """
    Retrieve food menu items.
    Allows passengers to filter meals by delivery station, diet (veg, non-veg, beverages), and availability.
    """
    query = db.query(FoodMenu)

    if station_id is not None:
        query = query.filter(FoodMenu.station_id == station_id)

    if category:
        query = query.filter(FoodMenu.category.ilike(category.strip()))

    if is_available is not None:
        query = query.filter(FoodMenu.is_available == is_available)

    items = query.all()

    # Populate nested vendor & station names for UI convenience
    result = []
    for item in items:
        out = FoodMenuOut(
            id=item.id,
            vendor_id=item.vendor_id,
            station_id=item.station_id,
            item_name=item.item_name,
            category=item.category,
            price=item.price,
            photo_url=item.photo_url,
            is_available=item.is_available,
            station_name=item.station.station_name if item.station else None,
            station_code=item.station.station_code if item.station else None,
            vendor_name=item.vendor.name if item.vendor else None,
        )
        result.append(out)

    return result


@router.post("/", response_model=FoodMenuOut, status_code=status.HTTP_201_CREATED)
def add_menu_item(
    item_in: FoodMenuCreate,
    current_user: User = Depends(require_role("vendor", "admin")),
    db: Session = Depends(get_db),
):
    """
    Vendor-only: Add a new meal item to the catering menu with S3 photo key.
    The meal is pinned to the specified station and current vendor.
    """
    # Verify station exists
    station = db.query(Station).filter(Station.id == item_in.station_id).first()
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Station with ID {item_in.station_id} does not exist.",
        )

    normalized_category = item_in.category.lower().strip()
    if normalized_category not in ["veg", "non-veg", "beverages"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category must be 'veg', 'non-veg', or 'beverages'.",
        )

    menu_item = FoodMenu(
        vendor_id=current_user.id,
        station_id=item_in.station_id,
        item_name=item_in.item_name.strip(),
        category=normalized_category,
        price=float(item_in.price),
        photo_url=item_in.photo_url,
        is_available=item_in.is_available,
    )
    db.add(menu_item)
    db.commit()
    db.refresh(menu_item)

    return FoodMenuOut(
        id=menu_item.id,
        vendor_id=menu_item.vendor_id,
        station_id=menu_item.station_id,
        item_name=menu_item.item_name,
        category=menu_item.category,
        price=menu_item.price,
        photo_url=menu_item.photo_url,
        is_available=menu_item.is_available,
        station_name=station.station_name,
        station_code=station.station_code,
        vendor_name=current_user.name,
    )
