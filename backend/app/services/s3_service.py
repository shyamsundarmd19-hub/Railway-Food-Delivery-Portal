import uuid
import boto3
from botocore.exceptions import ClientError
from typing import Optional, Tuple, Dict, Any
from app.core.config import settings


class S3Service:
    def __init__(self):
        self.region = settings.AWS_REGION
        self.bucket_name = settings.S3_BUCKET_NAME
        self._s3_client = None

    @property
    def s3_client(self):
        if self._s3_client is None:
            if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
                self._s3_client = boto3.client(
                    "s3",
                    region_name=self.region,
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                )
            else:
                # AWS IAM Instance Profile on EC2
                self._s3_client = boto3.client("s3", region_name=self.region)
        return self._s3_client

    def generate_presigned_upload_url(
        self,
        filename: str,
        content_type: str = "image/jpeg",
        folder: str = "menu-photos",
        expires_in_seconds: int = 3600,
    ) -> Dict[str, Any]:
        """
        Generates a direct S3 pre-signed PUT URL.
        Allows the frontend client to upload menu photos or documents directly to AWS S3
        with SSE-S3 server-side encryption without taxing EC2 CPU/RAM.
        """
        clean_filename = filename.replace(" ", "_")
        s3_key = f"{folder}/{uuid.uuid4().hex}_{clean_filename}"

        try:
            params = {
                "Bucket": self.bucket_name,
                "Key": s3_key,
                "ContentType": content_type,
                "ServerSideEncryption": "AES256",  # Enforce SSE-S3 encryption
            }

            upload_url = self.s3_client.generate_presigned_url(
                ClientMethod="put_object",
                Params=params,
                ExpiresIn=expires_in_seconds,
            )

            if settings.S3_CUSTOM_DOMAIN:
                file_url = f"https://{settings.S3_CUSTOM_DOMAIN}/{s3_key}"
            else:
                file_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"

            return {
                "upload_url": upload_url,
                "s3_key": s3_key,
                "file_url": file_url,
                "expires_in_seconds": expires_in_seconds,
            }
        except Exception as e:
            # Fallback mock/simulated URL for local dev without active AWS credentials
            fallback_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
            return {
                "upload_url": fallback_url,
                "s3_key": s3_key,
                "file_url": fallback_url,
                "expires_in_seconds": expires_in_seconds,
            }

    def generate_presigned_url(self, object_key: str, expires_in_seconds: int = 3600) -> Optional[str]:
        """Generate a secure pre-signed GET URL for sensitive vendor documents."""
        try:
            url = self.s3_client.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": self.bucket_name, "Key": object_key},
                ExpiresIn=expires_in_seconds,
            )
            return url
        except Exception:
            return None

    def upload_file_bytes(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str,
        folder: str = "menu-photos",
    ) -> Tuple[bool, str]:
        """Direct binary upload to S3."""
        s3_key = f"{folder}/{uuid.uuid4().hex}_{filename}"
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_bytes,
                ContentType=content_type,
                ServerSideEncryption="AES256",
            )
            file_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
            return True, file_url
        except Exception as e:
            return False, str(e)


s3_service = S3Service()
