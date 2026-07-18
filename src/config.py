# src/config.py
import os
from pathlib import Path
from dataclasses import dataclass
from typing import List, Optional
import yaml


@dataclass
class DVRConfig:
    host: str
    rtsp_port: int
    username: str
    password: str
    channels: List[int]
    rtsp_path_template: str

    def rtsp_url(self, channel: int) -> str:
        path = self.rtsp_path_template.format(channel=channel)
        return f"rtsp://{self.username}:{self.password}@{self.host}:{self.rtsp_port}{path}"


@dataclass
class MonitoringConfig:
    check_interval_seconds: int
    timeout_seconds: int
    consecutive_failures_alert: int
    cooldown_minutes: int


@dataclass
class AlertConfig:
    enabled: bool
    webhook_url: Optional[str]
    telegram_enabled: bool
    telegram_bot_token: Optional[str]
    telegram_chat_id: Optional[str]
    email_enabled: bool
    email_smtp_host: Optional[str]
    email_smtp_port: int
    email_username: Optional[str]
    email_password: Optional[str]
    email_to: Optional[str]


@dataclass
class StorageConfig:
    db_path: str
    retention_days: int


@dataclass
class MetricsConfig:
    prometheus_enabled: bool
    prometheus_port: int


@dataclass
class LoggingConfig:
    level: str
    file: str
    max_bytes: int
    backup_count: int


@dataclass
class Config:
    dvr: DVRConfig
    monitoring: MonitoringConfig
    alerts: AlertConfig
    storage: StorageConfig
    metrics: MetricsConfig
    logging: LoggingConfig


def load_config(path: str = "config.yaml") -> Config:
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    # Handle nested telegram/email configs
    alerts_data = data["alerts"]
    telegram = alerts_data.get("telegram", {})
    email = alerts_data.get("email", {})

    return Config(
        dvr=DVRConfig(**data["dvr"]),
        monitoring=MonitoringConfig(**data["monitoring"]),
        alerts=AlertConfig(
            enabled=alerts_data["enabled"],
            webhook_url=alerts_data.get("webhook_url", ""),
            telegram_enabled=telegram.get("enabled", False),
            telegram_bot_token=telegram.get("bot_token", ""),
            telegram_chat_id=telegram.get("chat_id", ""),
            email_enabled=email.get("enabled", False),
            email_smtp_host=email.get("smtp_host", ""),
            email_smtp_port=email.get("smtp_port", 587),
            email_username=email.get("username", ""),
            email_password=email.get("password", ""),
            email_to=email.get("to_email", ""),
        ),
        storage=StorageConfig(**data["storage"]),
        metrics=MetricsConfig(**data["metrics"]),
        logging=LoggingConfig(**data["logging"]),
    )


def ensure_dirs(config: Config) -> None:
    Path(config.storage.db_path).parent.mkdir(parents=True, exist_ok=True)
    Path(config.logging.file).parent.mkdir(parents=True, exist_ok=True)