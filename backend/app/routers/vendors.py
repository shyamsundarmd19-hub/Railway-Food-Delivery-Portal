from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.models import Vendor, User, UserRole
from app.schemas.schemas import VendorCreate, VendorResponse
from app.services.s3_service import s3_service

router = APIRouter(prefix="/vendors", tags=["Vendors & Stations"])

# Common major IRCTC Stations for quick suggestions
MAJOR_STATIONS = [
    {"code": "NDLS", "name": "New Delhi Railway Station", "city": "New Delhi", "state": "Delhi"},
    {"code": "BCT", "name": "Mumbai Central", "city": "Mumbai", "state": "Maharashtra"},
    {"code": "MAS", "name": "MGR Chennai Central", "city": "Chennai", "state": "Tamil Nadu"},
    {"code": "HWH", "name": "Howrah Junction", "city": "Kolkata", "state": "West Bengal"},
    {"code": "SBC", "name": "KSR Bengaluru City", "city": "Bengaluru", "state": "Karnataka"},
    {"code": "PNBE", "name": "Patna Junction", "city": "Patna", "state": "Bihar"},
    {"code": "CNB", "name": "Kanpur Central", "city": "Kanpur", "state": "Uttar Pradesh"},
    {"code": "BPL", "name": "Bhopal Junction", "city": "Bhopal", "state": "Madhya Pradesh"},
    {"code": "ADI", "name": "Ahmedabad Junction", "city": "Ahmedabad", "state": "Gujarat"},
    {"code": "HYB", "name": "Hyderabad Deccan", "city": "Hyderabad", "state": "Telangana"},
]


@router.get("/stations")
def get_popular_stations():
    """List major railway stations available for seat delivery."""
    return {"stations": MAJOR_STATIONS}


@router.get("/", response_model=List[VendorResponse])
def get_vendors_by_station(station_code: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieve verified food vendors for a specific station."""
    query = db.query(Vendor).filter(Vendor.is_open == True)
    if station_code:
        query = query.filter(Vendor.station_code == station_code.upper())
    return query.all()


@router.get("/{vendor_id}", response_model=VendorResponse)
def get_vendor_details(vendor_id: int, db: Session = Depends(get_db)):
    """Retrieve details for a single vendor."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found.")
    return vendor


@router.post("/register", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
def register_vendor(
    vendor_in: VendorCreate,
    current_user: User = Depends(require_role([UserRole.VENDOR, UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Register restaurant vendor profile for the logged in vendor user."""
    existing_vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()
    if existing_vendor:
        raise HTTPException(status_code=400, detail="Vendor profile already exists for this account.")

    vendor = Vendor(
        user_id=current_user.id,
        restaurant_name=vendor_in.restaurant_name,
        station_code=vendor_in.station_code.upper(),
        station_name=vendor_in.station_name,
        fssai_license_number=vendor_in.fssai_license_number,
        is_verified=True,  # In free tier demo, default to true or approval
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.post("/{vendor_id}/upload-license")
async def upload_vendor_fssai_license(
    vendor_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role([UserRole.VENDOR, UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Upload vendor FSSAI food safety license directly to AWS S3 with SSE-S3 encryption."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found.")

    if current_user.role != UserRole.ADMIN and vendor.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this vendor's license.")

    file_bytes = await file.read()
    success, result = s3_service.upload_file_bytes(
        file_bytes=file_bytes,
        filename=file.filename or "fssai_cert.pdf",
        content_type=file.content_type or "application/pdf",
        folder="vendor-licenses",
        is_private=True,
    )

    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to upload license to S3: {result}")

    vendor.fssai_document_s3_key = result
    db.commit()

    return {
        "message": "FSSAI license document uploaded and encrypted with SSE-S3 successfully.",
        "s3_key": result,
    }


@router.get("/{vendor_id}/license-presigned-url")
def get_license_presigned_url(
    vendor_id: int,
    current_user: User = Depends(require_role([UserRole.VENDOR, UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Generate a temporary presigned URL to view/download encrypted FSSAI certificate."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor or not vendor.fssai_document_s3_key:
        raise HTTPException(status_code=404, detail="Vendor license document not found.")

    if current_user.role != UserRole.ADMIN and vendor.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this document.")

    presigned_url = s3_service.generate_presigned_url(vendor.fssai_document_s3_key, expires_in_seconds=1800)
    if not presigned_url:
        raise HTTPException(status_code=500, detail="Could not generate presigned S3 URL.")

    return {"presigned_url": presigned_url, "expires_in": 1800}
