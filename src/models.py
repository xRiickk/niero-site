# src/models.py
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class HealthCheckRecord:
    channel: int
    timestamp: str  # ISO format
    status: str  # "online" | "offline" | "error"
    response_time_ms: Optional[int]
    error_message: Optional[str]


@dataclass
class AlertRecord:
    channel: int
    timestamp: str  # ISO format
    alert_type: str  # "offline" | "recovered" | "error"
    message: str
    acknowledged: bool = False