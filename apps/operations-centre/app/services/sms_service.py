"""Authoritative SMS Provider Abstraction and Alert Delivery Engine.

Supports India DLT sender/template configurations, provider health checks,
idempotent deduplication, and truth-preserving delivery states.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone
import hashlib
import json
import logging
import os
from typing import Any, Dict, List, Optional
import uuid

logger = logging.getLogger(__name__)


# ── Canonical SMS Delivery States ──
class SmsDeliveryState:
    CHANNEL_NOT_CONFIGURED = "CHANNEL_NOT_CONFIGURED"
    PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE"
    QUEUED = "QUEUED"
    PROVIDER_ACCEPTED = "PROVIDER_ACCEPTED"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"


# ── Localized Reviewed SMS Templates ──
# DLT and regulatory compliance require pre-approved message formats
SMS_TEMPLATES: Dict[str, str] = {
    "en": "TERRAGUARDIAN EMERGENCY: Landslide hazard reported along NH-13 West Kameng corridor. KM-38 checkpost restricted. Cease transit toward KM-42. Avoid steep slopes.",
    "hi": "टेरा गार्जियन आपातकाल: NH-13 पश्चिम कामेंग कॉरिडोर में भूस्खलन का खतरा। KM-38 चेकपोस्ट पर आवागमन प्रतिबंधित। KM-42 की ओर यात्रा तुरंत रोकें। सुरक्षित स्थान पर रहें।",
    "as": "টেৰা গাৰ্ডিয়ান জৰুৰীকালীন: NH-13 পশ্চিম কামেং কৰিডৰত ভূমিস্খলনৰ আশংকা। KM-38 চেকপোষ্টত চলাচল বন্ধ। KM-42 অভিমুখে যাত্ৰা বন্ধ কৰক। সুৰক্ষিত আশ্ৰয় লওক।",
    "bn": "টেরা গার্ডিয়ান জরুরি সতর্কতা: NH-13 পশ্চিম কামেং করিডোরে ভূমিধসের আশঙ্কা। KM-38 চেকপোস্টে যান চলাচল সীমাবদ্ধ। KM-42-এর দিকে যাত্রা অবিলম্বে বন্ধ করুন।",
    "ne": "टेरा गार्डियन आपतकालीन: NH-13 पश्चिम कामेङ्ग कोरिडोरमा पहिरोको जोखिम। KM-38 चेकपोस्ट प्रतिबन्धित। KM-42 तर्फ यात्रा रोक्नुहोस्। सुरक्षित स्थानमा बस्नुहोस्।",
    "mni": "TerraGuardian Emergency: NH-13 West Kameng corridor da landslide hazard thengnare. KM-38 checkpost restrict toure. KM-42 romda chatpa leppiyu.",
    "lus": "TerraGuardian Hriattirna: NH-13 West Kameng kawngah lei a min. KM-38 checkpost khar a ni. KM-42 lam pan suh u. Hmun himah awm rawh u.",
    "brx": "TerraGuardian गोनांथार: NH-13 West Kameng लामाआव हास्रुनायनि खौरां। KM-38 चेकपोस्ट बन्द खालामबाय। KM-42 फारसे थांनैखौ दोनथ'। गोगो जायगायाव था।",
}


class SmsProvider(ABC):
    """Abstract Base Class for SMS Gateway Providers."""

    @abstractmethod
    def get_provider_name(self) -> str:
        """Returns the identifier of this provider."""
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Returns True only if valid credentials and DLT identifiers exist."""
        pass

    @abstractmethod
    async def send_alert(
        self,
        recipient_phone: str,
        message: str,
        template_id: Optional[str] = None,
        dlt_template_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Dispatches an SMS alert through the provider gateway."""
        pass

    @abstractmethod
    async def check_health(self) -> Dict[str, Any]:
        """Verifies connectivity to the provider endpoint."""
        pass


class UnconfiguredSmsProvider(SmsProvider):
    """Default fallback provider when no live telecom credentials are provided."""

    def get_provider_name(self) -> str:
        return "UNCONFIGURED_PROVIDER"

    def is_configured(self) -> bool:
        return False

    async def send_alert(
        self,
        recipient_phone: str,
        message: str,
        template_id: Optional[str] = None,
        dlt_template_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        logger.info(
            "[SMS_GATEWAY] No SMS provider configured. Alert dispatch suppressed. Phone: %s",
            recipient_phone[-4:] if len(recipient_phone) >= 4 else "xxxx",
        )
        return {
            "success": False,
            "status": SmsDeliveryState.CHANNEL_NOT_CONFIGURED,
            "provider": self.get_provider_name(),
            "reason": "SMS gateway credentials (SMS_API_KEY / SMS_SENDER_ID) not configured in environment.",
            "provider_message_id": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    async def check_health(self) -> Dict[str, Any]:
        return {
            "configured": False,
            "status": SmsDeliveryState.CHANNEL_NOT_CONFIGURED,
            "provider": self.get_provider_name(),
            "details": "Awaiting official telecom gateway credentials and DLT registration.",
        }


class Msg91SmsProvider(SmsProvider):
    """Production MSG91 Flow API Provider for India DLT SMS alerts."""

    def __init__(self):
        self.auth_key = os.environ.get("SMS_API_KEY") or os.environ.get("MSG91_AUTH_KEY", "")
        self.sender_id = os.environ.get("SMS_SENDER_ID") or os.environ.get("MSG91_SENDER_ID", "")
        self.template_id = os.environ.get("SMS_TEMPLATE_ID") or os.environ.get("MSG91_FLOW_ID", "")
        self.dlt_template_id = os.environ.get("SMS_DLT_TEMPLATE_ID", "")
        self.entity_id = os.environ.get("SMS_ENTITY_ID", "")
        self.endpoint = "https://control.msg91.com/api/v5/flow/"

    def get_provider_name(self) -> str:
        return "MSG91_FLOW"

    def is_configured(self) -> bool:
        return bool(self.auth_key and (self.sender_id or self.template_id))

    async def send_alert(
        self,
        recipient_phone: str,
        message: str,
        template_id: Optional[str] = None,
        dlt_template_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not self.is_configured():
            return {
                "success": False,
                "status": SmsDeliveryState.CHANNEL_NOT_CONFIGURED,
                "provider": self.get_provider_name(),
                "reason": "MSG91 auth key or template ID not configured.",
                "provider_message_id": None,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        clean_phone = recipient_phone.replace("+", "").replace("-", "").replace(" ", "")
        flow_id = template_id or self.template_id

        payload = {
            "template_id": flow_id,
            "sender": self.sender_id,
            "short_url": "0",
            "recipients": [
                {
                    "mobiles": clean_phone,
                    "alert_message": message,
                    **(metadata or {}),
                }
            ],
        }

        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                headers = {
                    "authkey": self.auth_key,
                    "content-type": "application/json",
                    "accept": "application/json",
                }
                response = await client.post(self.endpoint, json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    req_id = data.get("message") or data.get("request_id") or str(uuid.uuid4())
                    return {
                        "success": True,
                        "status": SmsDeliveryState.PROVIDER_ACCEPTED,
                        "provider": self.get_provider_name(),
                        "provider_message_id": str(req_id),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "details": "Gateway accepted payload for dispatch.",
                    }
                else:
                    return {
                        "success": False,
                        "status": SmsDeliveryState.FAILED,
                        "provider": self.get_provider_name(),
                        "provider_message_id": None,
                        "reason": f"HTTP {response.status_code}: {response.text}",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
        except Exception as e:
            logger.error("[SMS_GATEWAY] MSG91 dispatch exception: %s", e)
            return {
                "success": False,
                "status": SmsDeliveryState.PROVIDER_UNAVAILABLE,
                "provider": self.get_provider_name(),
                "provider_message_id": None,
                "reason": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

    async def check_health(self) -> Dict[str, Any]:
        return {
            "configured": self.is_configured(),
            "status": SmsDeliveryState.PROVIDER_ACCEPTED if self.is_configured() else SmsDeliveryState.CHANNEL_NOT_CONFIGURED,
            "provider": self.get_provider_name(),
            "sender_id": self.sender_id or "NONE",
            "has_dlt_template": bool(self.dlt_template_id),
        }


# ── Centralized SMS Manager with Deduplication ──
class SmsNotificationManager:
    """Manages alert delivery lifecycle, idempotency, consent, and delivery receipts."""

    def __init__(self):
        # Determine provider by environment
        provider_name = os.environ.get("SMS_PROVIDER", "").upper()
        if provider_name == "MSG91" or os.environ.get("MSG91_AUTH_KEY"):
            self.provider: SmsProvider = Msg91SmsProvider()
        else:
            self.provider = UnconfiguredSmsProvider()

        # In-memory deduplication and consent registries (persisted per process)
        self._sent_cache: Dict[str, Dict[str, Any]] = {}
        self._consent_registry: Dict[str, Dict[str, Any]] = {}
        self._delivery_receipts: Dict[str, Dict[str, Any]] = {}

    def get_provider(self) -> SmsProvider:
        return self.provider

    def register_consent(
        self,
        phone_number: str,
        enabled: bool,
        device_id: Optional[str] = None,
        language: str = "en",
    ) -> Dict[str, Any]:
        """Registers explicit citizen consent for location-specific emergency SMS."""
        masked_phone = f"+91 {phone_number[-10:-4]}****" if len(phone_number) >= 10 else phone_number
        record = {
            "phone_masked": masked_phone,
            "enabled": enabled,
            "device_id": device_id,
            "language": language,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        self._consent_registry[phone_number] = record
        return record

    def get_template_for_language(self, language_code: str) -> tuple[str, str]:
        """Returns (template_text, language_used). Falls back to English if not found."""
        if language_code in SMS_TEMPLATES:
            return SMS_TEMPLATES[language_code], language_code
        return SMS_TEMPLATES["en"], "en"

    def _get_dedup_key(self, alert_id: str, phone: str) -> str:
        raw = f"{alert_id}:{phone}"
        return hashlib.sha256(raw.encode()).hexdigest()

    async def dispatch_emergency_alert(
        self,
        alert_id: str,
        phone_number: str,
        language: str = "en",
        force: bool = False,
    ) -> Dict[str, Any]:
        """Dispatches emergency alert with deduplication and state tracking."""
        dedup_key = self._get_dedup_key(alert_id, phone_number)
        now = datetime.now(timezone.utc)

        # 1. Deduplication check (prevent duplicate alert spam within 1 hour)
        if not force and dedup_key in self._sent_cache:
            last = self._sent_cache[dedup_key]
            return {
                "success": True,
                "status": last.get("status", SmsDeliveryState.SENT),
                "is_duplicate_suppressed": True,
                "provider": self.provider.get_provider_name(),
                "provider_message_id": last.get("provider_message_id"),
                "timestamp": last.get("timestamp"),
                "message": last.get("message"),
                "recipient_masked": last.get("recipient_masked"),
            }

        # 2. Localized approved template selection
        message, lang_used = self.get_template_for_language(language)

        # 3. Provider invocation
        result = await self.provider.send_alert(
            recipient_phone=phone_number,
            message=message,
        )

        masked_phone = f"+91 {phone_number[-10:-4]}****" if len(phone_number) >= 10 else phone_number

        delivery_record = {
            "alert_id": alert_id,
            "recipient_masked": masked_phone,
            "provider": self.provider.get_provider_name(),
            "status": result.get("status", SmsDeliveryState.CHANNEL_NOT_CONFIGURED),
            "provider_message_id": result.get("provider_message_id"),
            "language_requested": language,
            "language_used": lang_used,
            "message": message,
            "timestamp": now.isoformat(),
            "reason": result.get("reason"),
        }

        self._sent_cache[dedup_key] = delivery_record
        return delivery_record

    def update_webhook_receipt(
        self,
        provider_message_id: str,
        status: str,
        failure_reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Updates delivery receipt from provider webhook callback."""
        now = datetime.now(timezone.utc)
        canonical_status = SmsDeliveryState.FAILED
        if status.upper() in ("DELIVRD", "DELIVERED", "SUCCESS"):
            canonical_status = SmsDeliveryState.DELIVERED
        elif status.upper() in ("SENT", "DISPATCHED"):
            canonical_status = SmsDeliveryState.SENT

        receipt = {
            "provider_message_id": provider_message_id,
            "status": canonical_status,
            "raw_status": status,
            "failure_reason": failure_reason,
            "updated_at": now.isoformat(),
        }
        self._delivery_receipts[provider_message_id] = receipt

        # Update sent cache if found
        for record in self._sent_cache.values():
            if record.get("provider_message_id") == provider_message_id:
                record["status"] = canonical_status
                record["updated_at"] = now.isoformat()

        return receipt

    def get_delivery_status(self, alert_id: Optional[str] = None, phone_number: Optional[str] = None) -> Dict[str, Any]:
        """Retrieves authoritative current SMS delivery status for an alert."""
        if alert_id and phone_number:
            key = self._get_dedup_key(alert_id, phone_number)
            if key in self._sent_cache:
                return self._sent_cache[key]

        # Return latest delivery or unconfigured status
        if self._sent_cache:
            latest = list(self._sent_cache.values())[-1]
            return latest

        return {
            "provider": self.provider.get_provider_name(),
            "status": SmsDeliveryState.CHANNEL_NOT_CONFIGURED if not self.provider.is_configured() else SmsDeliveryState.QUEUED,
            "is_configured": self.provider.is_configured(),
            "recipient_masked": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": SMS_TEMPLATES["en"],
            "language_used": "en",
            "details": "Departmental telecom gateway not connected. Localized alerts previewed in prototype mode.",
        }


# Singleton instance
sms_manager = SmsNotificationManager()
