"""TerraGuardian Domain Exceptions."""
from typing import Any

class DomainError(Exception):
    """Base class for domain-level exceptions."""
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class IncidentNotFoundError(DomainError):
    """Raised when an incident twin cannot be found."""
    def __init__(self, incident_id: Any = None, message: str | None = None):
        msg = message or f"Incident twin {incident_id} was not found."
        super().__init__(msg)
        self.incident_id = incident_id


class InvalidTransitionError(DomainError):
    """Raised when an illegal lifecycle transition is attempted."""
    def __init__(self, current_state: str, target_state: str, reason: str | None = None):
        msg = f"Transition REJECTED: Cannot transition incident from state '{current_state}' to '{target_state}'."
        if reason:
            msg += f" Reason: {reason}"
        super().__init__(msg)
        self.current_state = current_state
        self.target_state = target_state


class UnauthorizedAuthorityError(DomainError):
    """Raised when a safety-critical transition lacks proper human authority."""
    pass


class PreconditionFailedError(DomainError):
    """Raised when a transition guard precondition is not satisfied."""
    pass


class ActionNotFoundError(DomainError):
    """Raised when an action task cannot be found."""
    pass

