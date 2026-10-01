"""Secure Storage Provider Abstraction for Citizen Evidence Images.

Supports LocalStorageProvider for local development/testing and
ProductionObjectStorageProvider for persistent cloud object storage (S3 / R2 / GCS / Supabase).
Prevents path traversal, validates image bytes, checks magic numbers, and computes cryptographic hashes.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
import hashlib
import io
import logging
import os
from pathlib import Path
from typing import Optional
from PIL import Image
from pydantic import BaseModel

logger = logging.getLogger(__name__)

if os.environ.get("VERCEL"):
    UPLOAD_DIR = Path("/tmp") / "uploads" / "citizen"
else:
    try:
        candidate = Path(__file__).resolve().parent.parent.parent / "data" / "uploads" / "citizen"
        if "zip" in str(candidate).lower():
            candidate = Path(os.environ.get("TEMP", "/tmp")) / "terraguardian" / "uploads" / "citizen"
        UPLOAD_DIR = candidate
    except Exception:
        UPLOAD_DIR = Path(os.environ.get("TEMP", "/tmp")) / "terraguardian" / "uploads" / "citizen"

try:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
except Exception as e:
    logger.warning(f"Could not create local upload directory: {e}")

MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


class StoredImageMetadata(BaseModel):
    storage_path: str
    image_url: str
    image_hash: str
    file_size: int
    width: int
    height: int
    mime_type: str
    storage_provider: str = "local"


class BaseStorageProvider(ABC):
    """Abstract base class for evidence storage providers."""

    @abstractmethod
    def save_image(
        self,
        image_bytes: bytes,
        clean_filename: str,
        image_hash: str,
        width: int,
        height: int,
        mime_type: str,
    ) -> StoredImageMetadata:
        """Persist image and return metadata with accessible URL."""
        pass

    @abstractmethod
    def get_image(self, file_key_or_url: str) -> Optional[bytes]:
        """Retrieve image bytes by key or URL."""
        pass

    @abstractmethod
    def delete_image(self, file_key_or_url: str) -> bool:
        """Delete image from storage according to retention policy."""
        pass


class LocalStorageProvider(BaseStorageProvider):
    """Local filesystem storage provider with path-traversal prevention."""

    def __init__(self, base_dir: Path = UPLOAD_DIR):
        self.base_dir = base_dir.resolve()
        try:
            self.base_dir.mkdir(parents=True, exist_ok=True)
        except Exception:
            pass

    def save_image(
        self,
        image_bytes: bytes,
        clean_filename: str,
        image_hash: str,
        width: int,
        height: int,
        mime_type: str,
    ) -> StoredImageMetadata:
        target_file = (self.base_dir / clean_filename).resolve()
        if not str(target_file).startswith(str(self.base_dir)):
            raise ValueError("Path traversal attempt detected in target image filename.")

        with open(target_file, "wb") as f:
            f.write(image_bytes)

        file_size = target_file.stat().st_size
        relative_url = f"/uploads/citizen/{clean_filename}"

        return StoredImageMetadata(
            storage_path=str(target_file),
            image_url=relative_url,
            image_hash=image_hash,
            file_size=file_size,
            width=width,
            height=height,
            mime_type=mime_type,
            storage_provider="local",
        )

    def get_image(self, file_key_or_url: str) -> Optional[bytes]:
        filename = Path(file_key_or_url).name
        target_file = (self.base_dir / filename).resolve()
        if not str(target_file).startswith(str(self.base_dir)) or not target_file.is_file():
            return None
        return target_file.read_bytes()

    def delete_image(self, file_key_or_url: str) -> bool:
        filename = Path(file_key_or_url).name
        target_file = (self.base_dir / filename).resolve()
        if str(target_file).startswith(str(self.base_dir)) and target_file.is_file():
            target_file.unlink()
            return True
        return False


class ProductionObjectStorageProvider(BaseStorageProvider):
    """Persistent cloud object storage provider (S3 / R2 / MinIO / GCS / Supabase).

    Uploads sanitized evidence bytes to durable object storage.
    Configured via standard environment variables:
    - S3_BUCKET_NAME (or OBJECT_STORAGE_BUCKET)
    - S3_ENDPOINT_URL (optional for Cloudflare R2, MinIO, Supabase)
    - S3_REGION_NAME (defaults to ap-south-1)
    - AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (or S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY)
    - STORAGE_PUBLIC_BASE_URL (optional custom CDN/origin prefix)
    """

    def __init__(self):
        self.bucket = (
            os.getenv("S3_BUCKET_NAME")
            or os.getenv("OBJECT_STORAGE_BUCKET")
            or "terraguardian-evidence"
        )
        self.endpoint_url = (
            os.getenv("S3_ENDPOINT_URL")
            or os.getenv("OBJECT_STORAGE_ENDPOINT")
        )
        self.region = (
            os.getenv("S3_REGION_NAME")
            or os.getenv("AWS_DEFAULT_REGION")
            or "ap-south-1"
        )
        self.access_key = (
            os.getenv("S3_ACCESS_KEY_ID")
            or os.getenv("AWS_ACCESS_KEY_ID")
        )
        self.secret_key = (
            os.getenv("S3_SECRET_ACCESS_KEY")
            or os.getenv("AWS_SECRET_ACCESS_KEY")
        )
        self.public_base_url = (
            os.getenv("STORAGE_PUBLIC_BASE_URL")
            or os.getenv("OBJECT_STORAGE_PUBLIC_URL")
        )
        # Fallback local provider if object storage credentials are not provided
        self._fallback_local = LocalStorageProvider()

    def is_configured(self) -> bool:
        return bool(self.bucket and (self.access_key or self.endpoint_url or self.public_base_url))

    def save_image(
        self,
        image_bytes: bytes,
        clean_filename: str,
        image_hash: str,
        width: int,
        height: int,
        mime_type: str,
    ) -> StoredImageMetadata:
        key = f"citizen/{clean_filename}"

        if not self.is_configured():
            logger.warning(
                "ProductionObjectStorageProvider: S3/object storage credentials not set. "
                "Persisting to local storage fallback."
            )
            return self._fallback_local.save_image(
                image_bytes, clean_filename, image_hash, width, height, mime_type
            )

        # 1. Attempt boto3 if installed
        try:
            import boto3
            session = boto3.session.Session()
            client_kwargs = {"region_name": self.region}
            if self.endpoint_url:
                client_kwargs["endpoint_url"] = self.endpoint_url
            if self.access_key and self.secret_key:
                client_kwargs["aws_access_key_id"] = self.access_key
                client_kwargs["aws_secret_access_key"] = self.secret_key

            s3 = session.client("s3", **client_kwargs)
            s3.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=image_bytes,
                ContentType=mime_type,
                Metadata={
                    "image_hash": image_hash,
                    "width": str(width),
                    "height": str(height),
                },
            )
        except ImportError:
            # 2. Direct HTTP upload if custom endpoint/presigned URL configured
            import httpx
            if self.public_base_url and self.access_key:
                upload_url = f"{self.endpoint_url or self.public_base_url}/{self.bucket}/{key}"
                try:
                    with httpx.Client(timeout=15.0) as client:
                        resp = client.put(
                            upload_url,
                            content=image_bytes,
                            headers={"Content-Type": mime_type},
                        )
                        resp.raise_for_status()
                except Exception as ex:
                    logger.error(f"Direct HTTP object upload failed: {ex}. Using local fallback.")
                    return self._fallback_local.save_image(
                        image_bytes, clean_filename, image_hash, width, height, mime_type
                    )
            else:
                logger.info("boto3 not installed; saving image via local provider.")
                return self._fallback_local.save_image(
                    image_bytes, clean_filename, image_hash, width, height, mime_type
                )
        except Exception as e:
            logger.error(f"S3 object upload failed: {e}. Falling back to local storage.")
            return self._fallback_local.save_image(
                image_bytes, clean_filename, image_hash, width, height, mime_type
            )

        if self.public_base_url:
            public_url = f"{self.public_base_url.rstrip('/')}/{key}"
        elif self.endpoint_url:
            public_url = f"{self.endpoint_url.rstrip('/')}/{self.bucket}/{key}"
        else:
            public_url = f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{key}"

        return StoredImageMetadata(
            storage_path=f"s3://{self.bucket}/{key}",
            image_url=public_url,
            image_hash=image_hash,
            file_size=len(image_bytes),
            width=width,
            height=height,
            mime_type=mime_type,
            storage_provider="production_s3",
        )

    def get_image(self, file_key_or_url: str) -> Optional[bytes]:
        if not self.is_configured():
            return self._fallback_local.get_image(file_key_or_url)
        try:
            import boto3
            client_kwargs = {"region_name": self.region}
            if self.endpoint_url:
                client_kwargs["endpoint_url"] = self.endpoint_url
            if self.access_key and self.secret_key:
                client_kwargs["aws_access_key_id"] = self.access_key
                client_kwargs["aws_secret_access_key"] = self.secret_key
            s3 = boto3.client("s3", **client_kwargs)
            key = file_key_or_url.split(f"{self.bucket}/")[-1] if self.bucket in file_key_or_url else file_key_or_url
            resp = s3.get_object(Bucket=self.bucket, Key=key)
            return resp["Body"].read()
        except Exception:
            return self._fallback_local.get_image(file_key_or_url)

    def delete_image(self, file_key_or_url: str) -> bool:
        if not self.is_configured():
            return self._fallback_local.delete_image(file_key_or_url)
        try:
            import boto3
            client_kwargs = {"region_name": self.region}
            if self.endpoint_url:
                client_kwargs["endpoint_url"] = self.endpoint_url
            if self.access_key and self.secret_key:
                client_kwargs["aws_access_key_id"] = self.access_key
                client_kwargs["aws_secret_access_key"] = self.secret_key
            s3 = boto3.client("s3", **client_kwargs)
            key = file_key_or_url.split(f"{self.bucket}/")[-1] if self.bucket in file_key_or_url else file_key_or_url
            s3.delete_object(Bucket=self.bucket, Key=key)
            return True
        except Exception:
            return self._fallback_local.delete_image(file_key_or_url)


class EvidenceStorageProvider:
    """High-level evidence storage manager with strict verification & sanitization."""

    _local_provider = LocalStorageProvider()
    _production_provider = ProductionObjectStorageProvider()

    @classmethod
    def get_provider(cls) -> BaseStorageProvider:
        """Select active storage provider based on environment and configuration."""
        env_mode = os.getenv("STORAGE_PROVIDER") or os.getenv("STORAGE_BACKEND") or "local"
        if env_mode.lower() in ("production", "s3", "cloud", "object_storage"):
            return cls._production_provider
        return cls._local_provider

    @classmethod
    def validate_and_save_image(
        cls,
        image_bytes: bytes,
        tracking_id: str,
        declared_mime_type: str = "image/jpeg",
    ) -> StoredImageMetadata:
        """Validate, hash, re-encode, and persist image bytes."""
        if len(image_bytes) == 0:
            raise ValueError("Uploaded image file is empty (0 bytes).")
        if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
            raise ValueError(
                f"Uploaded image exceeds maximum allowable limit of {MAX_IMAGE_SIZE_BYTES // (1024*1024)}MB."
            )

        # Cryptographic SHA256 integrity hash
        image_hash = hashlib.sha256(image_bytes).hexdigest()

        # Pillow image verification
        try:
            with Image.open(io.BytesIO(image_bytes)) as img:
                img.verify()
                width, height = img.size
                format_name = (img.format or "").upper()
        except Exception as e:
            raise ValueError(f"Uploaded file is corrupted or not a valid decodable image: {e}")

        format_mime_map = {
            "JPEG": "image/jpeg",
            "PNG": "image/png",
            "WEBP": "image/webp",
        }
        detected_mime = format_mime_map.get(format_name)
        if not detected_mime or detected_mime not in ALLOWED_MIME_TYPES:
            raise ValueError(
                f"Unsupported image format: {format_name}. Supported formats: JPEG, PNG, WEBP."
            )

        # Re-open and re-encode to strip unsafe EXIF metadata and normalize to JPEG
        sanitized_buf = io.BytesIO()
        with Image.open(io.BytesIO(image_bytes)) as img:
            rgb_img = img.convert("RGB")
            rgb_img.save(sanitized_buf, format="JPEG", quality=90, optimize=True)

        sanitized_bytes = sanitized_buf.getvalue()
        clean_filename = f"{tracking_id}_{image_hash[:12]}.jpg"

        provider = cls.get_provider()
        return provider.save_image(
            image_bytes=sanitized_bytes,
            clean_filename=clean_filename,
            image_hash=image_hash,
            width=width,
            height=height,
            mime_type="image/jpeg",
        )

    @classmethod
    def get_image(cls, file_key_or_url: str) -> Optional[bytes]:
        """Retrieve image bytes via active provider."""
        return cls.get_provider().get_image(file_key_or_url)

    @classmethod
    def delete_image(cls, file_key_or_url: str) -> bool:
        """Delete image via active provider."""
        return cls.get_provider().delete_image(file_key_or_url)

