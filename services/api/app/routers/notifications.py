"""Authoritative Notifications Router for SMS Delivery, Consent, and Webhooks."""

from __future__ import annotations

import logging
from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from app.services.sms_service import SmsDeliveryState, sms_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications & Telecom SMS Delivery"])


class SmsConsentPayload(BaseModel):
    phone_number: str = Field(..., min_length=10, max_length=15)
    enabled: bool = True
    device_id: Optional[str] = None
    language: Optional[str] = "en"


class SendSmsAlertPayload(BaseModel):
    alert_id: str = "tg-alert-2048"
    phone_number: str = Field(..., min_length=10, max_length=15)
    language: Optional[str] = "en"
    force: Optional[bool] = False


class WebhookPayload(BaseModel):
    request_id: Optional[str] = None
    message_id: Optional[str] = None
    status: str
    description: Optional[str] = None


@router.post("/sms/register-consent")
async def register_sms_consent(payload: SmsConsentPayload):
    """Registers explicit citizen consent for location-relevant disaster alerts."""
    result = sms_manager.register_consent(
        phone_number=payload.phone_number,
        enabled=payload.enabled,
        device_id=payload.device_id,
        language=payload.language or "en",
    )
    return {"status": "ok", "consent": result}


@router.post("/sms/send-alert")
async def send_sms_alert(payload: SendSmsAlertPayload):
    """Triggers SMS alert dispatch through configured gateway, respecting DLT templates & dedup."""
    result = await sms_manager.dispatch_emergency_alert(
        alert_id=payload.alert_id,
        phone_number=payload.phone_number,
        language=payload.language or "en",
        force=payload.force or False,
    )
    return result


@router.get("/sms/status")
async def get_sms_status(alert_id: Optional[str] = Query(None), phone: Optional[str] = Query(None)):
    """Retrieves authoritative current SMS delivery and provider status."""
    return sms_manager.get_delivery_status(alert_id=alert_id, phone_number=phone)


@router.get("/sms/health")
async def get_sms_health():
    """Returns SMS gateway provider health status."""
    return await sms_manager.get_provider().check_health()


@router.post("/sms/webhook")
async def sms_provider_webhook(request: Request):
    """Receives and validates delivery receipts from official SMS providers."""
    try:
        body = await request.json()
    except Exception:
        body = dict(await request.form())

    provider_msg_id = body.get("requestId") or body.get("message_id") or body.get("request_id")
    raw_status = body.get("status") or body.get("delivery_status") or "UNKNOWN"
    reason = body.get("description") or body.get("failure_reason")

    if not provider_msg_id:
        return {"status": "ignored", "reason": "No provider message id found"}

    receipt = sms_manager.update_webhook_receipt(
        provider_message_id=str(provider_msg_id),
        status=str(raw_status),
        failure_reason=str(reason) if reason else None,
    )
    logger.info("[SMS_WEBHOOK] Updated receipt for %s: %s", provider_msg_id, receipt["status"])
    return {"status": "ok", "receipt": receipt}
