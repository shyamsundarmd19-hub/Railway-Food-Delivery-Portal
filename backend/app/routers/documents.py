from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from app.models.models import User
from app.schemas.schemas import S3UploadUrlRequest, S3UploadUrlResponse
from app.services.s3_service import s3_service

router = APIRouter(prefix="/documents", tags=["Documents & S3 Cloud Storage"])


@router.post("/upload-url", response_model=S3UploadUrlResponse)
def get_s3_presigned_upload_url(
    upload_req: S3UploadUrlRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generate an AWS S3 presigned PUT URL with SSE-S3 AES-256 encryption.
    Allows clients/vendors to upload food images and KYC documents directly to AWS S3.
    This protects the EC2 instance from file bandwidth and memory consumption.
    """
    allowed_folders = ["menu-photos", "vendor-licenses", "receipts"]
    folder = upload_req.folder if upload_req.folder in allowed_folders else "menu-photos"

    result = s3_service.generate_presigned_upload_url(
        filename=upload_req.filename,
        content_type=upload_req.content_type,
        folder=folder,
        expires_in_seconds=3600,
    )

    return S3UploadUrlResponse(
        upload_url=result["upload_url"],
        s3_key=result["s3_key"],
        file_url=result["file_url"],
        expires_in_seconds=result["expires_in_seconds"],
    )
