"""Local-only demonstration accounts. Excluded from production function bundles."""

from app.domain.enums import ActorRole

DEMO_USERS = [
    {
        "username": "citizen",
        "email": "citizen@terraguardian.gov.in",
        "password": "Citizen#2026",
        "full_name": "Citizen Observer (West Kameng)",
        "role": ActorRole.CITIZEN.value,
        "agency": "Citizen Community Watch",
        "badge_number": None,
    },
    {
        "username": "operator",
        "email": "operator@terraguardian.gov.in",
        "password": "Terra#Op2026",
        "full_name": "Operations Duty Officer",
        "role": ActorRole.OPERATOR.value,
        "agency": "State Disaster Operations Centre",
        "badge_number": "SDOC-WK-102",
    },
    {
        "username": "assessment",
        "email": "assessment@terraguardian.gov.in",
        "password": "Terra#Assess2026",
        "full_name": "Dr. T. Norbu (Geotechnical Assessment Officer)",
        "role": ActorRole.ASSESSMENT_OFFICER.value,
        "agency": "State Hazard Assessment Cell / GSI NER",
        "badge_number": "GSI-NER-88",
    },
    {
        "username": "patrol",
        "email": "patrol@terraguardian.gov.in",
        "password": "Patrol#2026",
        "full_name": "ASI D. Sonam",
        "role": ActorRole.FIELD_RESPONDER.value,
        "agency": "West Kameng Traffic Police",
        "badge_number": "WKTP-38",
    },
    {
        "username": "magistrate",
        "email": "magistrate@terraguardian.gov.in",
        "password": "Terra#Admin2026",
        "full_name": "P. Tsering, IAS (District Magistrate)",
        "role": ActorRole.AUTHORIZATION_OFFICER.value,
        "agency": "District Disaster Management Authority",
        "badge_number": "DM-WK-01",
    },
    {
        "username": "reviewer",
        "email": "reviewer@terraguardian.gov.in",
        "password": "Terra#Review2026",
        "full_name": "K. Sharma (Independent Statutory Reviewer)",
        "role": ActorRole.REVIEWER.value,
        "agency": "NDMA State Oversight Division",
        "badge_number": "NDMA-REV-14",
    },
    {
        "username": "admin",
        "email": "admin@terraguardian.gov.in",
        "password": "Terra#SuperAdmin2026",
        "full_name": "System & Model Governance Administrator",
        "role": ActorRole.ADMINISTRATOR.value,
        "agency": "State IT & Disaster Systems Hub",
        "badge_number": "SYS-ADM-01",
    },
]
