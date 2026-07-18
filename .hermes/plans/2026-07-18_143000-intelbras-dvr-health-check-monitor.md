# Intelbras DVR Health Check Monitor Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a health check monitoring system for Intelbras DVR cameras via RTSP to detect online/offline camera status, with alerts and logging.

**Architecture:** Python-based monitoring service using RTSP connection health checks (OPTIONS/DESCRIBE/ANNOUNCE requests) with periodic polling, alerting via webhook/email/Telegram, and persistent status logging (SQLite + optional Prometheus metrics).

**Tech Stack:** Python 3.11+, `requests`/`ffmpeg-python`/`opencv-python` for RTSP health checks, `sqlite3` for history, `apscheduler` for scheduling, `python-telegram-bot`/`requests` for alerts, `prometheus-client` optional for metrics.

---

### Task 1: Project Setup & Configuration

**Objective:** Initialize project structure, config management, and dependencies.

**Files:**
- Create: `config.yaml`
- Create: `requirements.txt`
- Create: `src/__init__.py`
- Create: `src/config.py`
- Create: `src/__main__.py`
- Create: `.gitignore`

**Step 1: Write config.yaml**

```yaml
# config.yaml
dvr:
  host: "192.168.1.100"          # DVR IP address
  rtsp_port: 554                 # RTSP port (default 554)
  username: "admin"              # DVR username
  password: "your_password"      # DVR password
  channels: [1, 2, 3, 4, 5, 6, 7, 8]  # Camera channels to monitor
  # RTSP URL format for Intelbras/Dahua OEM: rtsp://user:pass@ip:554/cam/realmonitor?channel=X&subtype=0
  rtsp_path_template: "/cam/realmonitor?channel={channel}&subtype=0"

monitoring:
  check_interval_seconds: 30     # Check interval
  timeout_seconds: 10            # RTSP connection timeout
  consecutive_failures_alert: 3  # Alert after N consecutive failures
  cooldown_minutes: 15           # Alert cooldown period

alerts:
  enabled: true
  webhook_url: ""                # Optional: webhook URL (POST JSON)
  telegram:
    enabled: false
    bot_token: ""
    chat_id: ""
  email:
    enabled: false
    smtp_host: ""
    smtp_port: 587
    username: ""
    password: ""
    to_email: ""

storage:
  db_path: "data/health.db"
  retention_days: 30

metrics:
  prometheus_enabled: false
  prometheus_port: 9090

logging:
  level: "INFO"
  file: "logs/health_check.log"
  max_bytes: 10485760
  backup_count: 5
```

**Step 2: Write requirements.txt**

```
requests==2.32.3
ffmpeg-python==0.2.0
opencv-python-headless==4.10.0.84
apscheduler==3.10.4
python-telegram-bot==21.4
prometheus-client==0.19.0
pyyaml==6.0.1
python-dotenv==1.0.1
```

**Step 3: Write src/config.py**

```python
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
    return Config(
        dvr=DVRConfig(**data["dvr"]),
        monitoring=MonitoringConfig(**data["monitoring"]),
        alerts=AlertConfig(**data["alerts"]),
        storage=StorageConfig(**data["storage"]),
        metrics=MetricsConfig(**data["metrics"]),
        logging=LoggingConfig(**data["logging"]),
    )


def ensure_dirs(config: Config) -> None:
    Path(config.storage.db_path).parent.mkdir(parents=True, exist_ok=True)
    Path(config.logging.file).parent.mkdir(parents=True, exist_ok=True)
```

**Step 4: Write src/__main__.py (entry point stub)**

```python
# src/__main__.py
"""Intelbras DVR Health Check Monitor - Entry point."""
from src.config import load_config, ensure_dirs


def main():
    config = load_config()
    ensure_dirs(config)
    print(f"Config loaded: DVR at {config.dvr.host}, monitoring {len(config.dvr.channels)} channels")
    # TODO: Initialize monitor, scheduler, alerts


if __name__ == "__main__":
    main()
```

**Step 5: Write .gitignore**

```
__pycache__/
*.pyc
.env
data/
logs/
*.db
.venv/
.pytest_cache/
.coverage
```

**Verification:**
- Run: `python -m src` → Should print config summary
- Run: `pip install -r requirements.txt` → All deps install


---

### Task 2: Database Schema & Models

**Objective:** Create SQLite database with health check history and alert tracking tables.

**Files:**
- Create: `src/models.py`
- Create: `src/database.py`
- Test: `tests/test_database.py`

**Step 1: Write failing test** (`tests/test_database.py`)

```python
# tests/test_database.py
import tempfile
import os
from src.database import Database, HealthCheckRecord, AlertRecord


def test_database_creates_tables():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    try:
        db = Database(db_path)
        # Tables should exist
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {row[0] for row in cursor.fetchall()}
        assert "health_checks" in tables
        assert "alerts" in tables
        conn.close()
    finally:
        os.unlink(db_path)


def test_record_health_check():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    try:
        db = Database(db_path)
        record = HealthCheckRecord(
            channel=1,
            timestamp="2026-07-18T10:00:00",
            status="online",
            response_time_ms=150,
            error_message=None,
        )
        db.record_health_check(record)
        history = db.get_recent_health_checks(channel=1, limit=10)
        assert len(history) == 1
        assert history[0].status == "online"
        assert history[0].response_time_ms == 150
    finally:
        os.unlink(db_path)


def test_record_alert():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    try:
        db = Database(db_path)
        alert = AlertRecord(
            channel=1,
            timestamp="2026-07-18T10:00:00",
            alert_type="offline",
            message="Camera 1 offline after 3 failures",
            acknowledged=False,
        )
        db.record_alert(alert)
        alerts = db.get_unacknowledged_alerts()
        assert len(alerts) == 1
        assert alerts[0].alert_type == "offline"
    finally:
        os.unlink(db_path)
```

**Step 2: Run test to verify failure**

```bash
pytest tests/test_database.py -v
# Expected: FAIL - ModuleNotFoundError / ImportError
```

**Step 3: Write src/models.py**

```python
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
```

**Step 4: Write src/database.py**

```python
# src/database.py
import sqlite3
import os
from contextlib import contextmanager
from typing import List, Optional
from src.models import HealthCheckRecord, AlertRecord


class Database:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with self._conn() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS health_checks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel INTEGER NOT NULL,
                    timestamp TEXT NOT NULL,
                    status TEXT NOT NULL,
                    response_time_ms INTEGER,
                    error_message TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_health_checks_channel_time
                    ON health_checks(channel, timestamp DESC);

                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel INTEGER NOT NULL,
                    timestamp TEXT NOT NULL,
                    alert_type TEXT NOT NULL,
                    message TEXT NOT NULL,
                    acknowledged INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_alerts_channel_time
                    ON alerts(channel, timestamp DESC);
            """)

    @contextmanager
    def _conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def record_health_check(self, record: HealthCheckRecord) -> int:
        with self._conn() as conn:
            cursor = conn.execute(
                """
                INSERT INTO health_checks (channel, timestamp, status, response_time_ms, error_message)
                VALUES (?, ?, ?, ?, ?)
                """,
                (record.channel, record.timestamp, record.status,
                 record.response_time_ms, record.error_message),
            )
            return cursor.lastrowid

    def get_recent_health_checks(
        self, channel: Optional[int] = None, limit: int = 100
    ) -> List[HealthCheckRecord]:
        with self._conn() as conn:
            if channel is not None:
                rows = conn.execute(
                    """
                    SELECT channel, timestamp, status, response_time_ms, error_message
                    FROM health_checks
                    WHERE channel = ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                    """,
                    (channel, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT channel, timestamp, status, response_time_ms, error_message
                    FROM health_checks
                    ORDER BY timestamp DESC
                    LIMIT ?
                    """,
                    (limit,),
                ).fetchall()
            return [
                HealthCheckRecord(
                    channel=row["channel"],
                    timestamp=row["timestamp"],
                    status=row["status"],
                    response_time_ms=row["response_time_ms"],
                    error_message=row["error_message"],
                )
                for row in rows
            ]

    def get_consecutive_failures(self, channel: int) -> int:
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT status FROM health_checks
                WHERE channel = ?
                ORDER BY timestamp DESC
                LIMIT 100
                """,
                (channel,),
            ).fetchall()
        count = 0
        for row in rows:
            if row["status"] != "online":
                count += 1
            else:
                break
        return count

    def record_alert(self, alert: AlertRecord) -> int:
        with self._conn() as conn:
            cursor = conn.execute(
                """
                INSERT INTO alerts (channel, timestamp, alert_type, message, acknowledged)
                VALUES (?, ?, ?, ?, ?)
                """,
                (alert.channel, alert.timestamp, alert.alert_type,
                 alert.message, int(alert.acknowledged)),
            )
            return cursor.lastrowid

    def get_unacknowledged_alerts(self) -> List[AlertRecord]:
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT channel, timestamp, alert_type, message, acknowledged
                FROM alerts
                WHERE acknowledged = 0
                ORDER BY timestamp DESC
                """
            ).fetchall()
        return [
            AlertRecord(
                channel=row["channel"],
                timestamp=row["timestamp"],
                alert_type=row["alert_type"],
                message=row["message"],
                acknowledged=bool(row["acknowledged"]),
            )
            for row in rows
        ]

    def cleanup_old_records(self, retention_days: int) -> int:
        with self._conn() as conn:
            cursor = conn.execute(
                """
                DELETE FROM health_checks
                WHERE timestamp < datetime('now', ?)
                """,
                (f"-{retention_days} days",),
            )
            health_deleted = cursor.rowcount
            cursor = conn.execute(
                """
                DELETE FROM alerts
                WHERE timestamp < datetime('now', ?)
                """,
                (f"-{retention_days} days",),
            )
            alert_deleted = cursor.rowcount
        return health_deleted + alert_deleted
```

**Step 5: Run test to verify pass**

```bash
pytest tests/test_database.py -v
# Expected: 3 passed
```

**Step 6: Commit**

```bash
git add src/models.py src/database.py tests/test_database.py
git commit -m "feat: add database models and SQLite storage for health checks"
```

---

### Task 3: RTSP Health Checker

**Objective:** Implement RTSP connectivity check using OPTIONS/DESCRIBE requests via `requests` and fallback to `ffprobe`/`cv2.VideoCapture`.

**Files:**
- Create: `src/checker.py`
- Test: `tests/test_checker.py`

**Step 1: Write failing test** (`tests/test_checker.py`)

```python
# tests/test_checker.py
import pytest
from unittest.mock import Mock, patch
from src.checker import RTSPHealthChecker, CheckResult


def test_checker_online_with_options():
    checker = RTSPHealthChecker(timeout=5)
    with patch("src.checker.requests.request") as mock_request:
        mock_resp = Mock()
        mock_resp.status_code = 200
        mock_request.return_value = mock_resp

        result = checker.check("rtsp://user:pass@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0")
        assert result.status == "online"
        assert result.response_time_ms is not None
        assert result.error_message is None


def test_checker_offline_timeout():
    checker = RTSPHealthChecker(timeout=5)
    with patch("src.checker.requests.request") as mock_request:
        import requests
        mock_request.side_effect = requests.Timeout()

        result = checker.check("rtsp://user:pass@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0")
        assert result.status == "offline"
        assert "timeout" in result.error_message.lower()


def test_checker_error_connection_refused():
    checker = RTSPHealthChecker(timeout=5)
    with patch("src.checker.requests.request") as mock_request:
        import requests
        mock_request.side_effect = requests.ConnectionError("Connection refused")

        result = checker.check("rtsp://user:pass@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0")
        assert result.status == "offline"
        assert "connection refused" in result.error_message.lower()
```

**Step 2: Run test to verify failure**

```bash
pytest tests/test_checker.py -v
# Expected: FAIL - ImportError
```

**Step 3: Write src/checker.py**

```python
# src/checker.py
import time
import requests
import subprocess
import shlex
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse


@dataclass
class CheckResult:
    status: str  # "online" | "offline" | "error"
    response_time_ms: Optional[int]
    error_message: Optional[str]


class RTSPHealthChecker:
    """Health checker for RTSP streams using multiple methods."""

    def __init__(self, timeout: int = 10):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "IntelbrasDVRHealthCheck/1.0"
        })

    def check(self, rtsp_url: str) -> CheckResult:
        """
        Check RTSP stream health using multiple methods in order:
        1. RTSP OPTIONS request (fast, no stream data)
        2. RTSP DESCRIBE request (gets SDP)
        3. ffprobe (if available, validates actual stream)
        """
        start = time.perf_counter()

        # Method 1: RTSP OPTIONS (lightweight)
        result = self._check_options(rtsp_url)
        if result.status == "online":
            result.response_time_ms = int((time.perf_counter() - start) * 1000)
            return result

        # Method 2: RTSP DESCRIBE
        result = self._check_describe(rtsp_url)
        if result.status == "online":
            result.response_time_ms = int((time.perf_counter() - start) * 1000)
            return result

        # Method 3: ffprobe fallback (validates actual stream decode)
        result = self._check_ffprobe(rtsp_url)
        result.response_time_ms = int((time.perf_counter() - start) * 1000)
        return result

    def _check_options(self, rtsp_url: str) -> CheckResult:
        try:
            parsed = urlparse(rtsp_url)
            host = parsed.hostname
            port = parsed.port or 554
            path = parsed.path or "/"
            if parsed.query:
                path += "?" + parsed.query

            # RTSP OPTIONS request
            url = f"rtsp://{host}:{port}{path}"
            resp = self.session.request(
                "OPTIONS", url, timeout=self.timeout, auth=self._extract_auth(rtsp_url)
            )
            if resp.status_code in (200, 401, 403):  # 401/403 = server responded
                return CheckResult("online", None, None)
            return CheckResult("offline", None, f"RTSP OPTIONS returned {resp.status_code}")
        except requests.Timeout:
            return CheckResult("offline", None, "RTSP OPTIONS timeout")
        except requests.ConnectionError as e:
            return CheckResult("offline", None, f"RTSP OPTIONS connection error: {e}")
        except Exception as e:
            return CheckResult("error", None, f"RTSP OPTIONS error: {e}")

    def _check_describe(self, rtsp_url: str) -> CheckResult:
        try:
            parsed = urlparse(rtsp_url)
            host = parsed.hostname
            port = parsed.port or 554
            path = parsed.path or "/"
            if parsed.query:
                path += "?" + parsed.query

            url = f"rtsp://{host}:{port}{path}"
            resp = self.session.request(
                "DESCRIBE", url, timeout=self.timeout, auth=self._extract_auth(rtsp_url)
            )
            if resp.status_code == 200 and "application/sdp" in resp.headers.get("Content-Type", ""):
                return CheckResult("online", None, None)
            return CheckResult("offline", None, f"RTSP DESCRIBE returned {resp.status_code}")
        except requests.Timeout:
            return CheckResult("offline", None, "RTSP DESCRIBE timeout")
        except requests.ConnectionError as e:
            return CheckResult("offline", None, f"RTSP DESCRIBE connection error: {e}")
        except Exception as e:
            return CheckResult("error", None, f"RTSP DESCRIBE error: {e}")

    def _check_ffprobe(self, rtsp_url: str) -> CheckResult:
        """Fallback using ffprobe to validate stream is actually decodable."""
        try:
            cmd = [
                "ffprobe", "-v", "error", "-select_streams", "v:0",
                "-show_entries", "stream=codec_name", "-of", "csv=p=0",
                "-rtsp_transport", "tcp", "-i", rtsp_url
            ]
            result = subprocess.run(cmd, capture_output=True, timeout=self.timeout, text=True)
            if result.returncode == 0 and result.stdout.strip():
                return CheckResult("online", None, None)
            return CheckResult("offline", None, f"ffprobe failed: {result.stderr.strip()}")
        except subprocess.TimeoutExpired:
            return CheckResult("offline", None, "ffprobe timeout")
        except FileNotFoundError:
            return CheckResult("error", None, "ffprobe not installed")
        except Exception as e:
            return CheckResult("error", None, f"ffprobe error: {e}")

    def _extract_auth(self, rtsp_url: str) -> Optional[requests.auth.HTTPDigestAuth]:
        """Extract username/password from RTSP URL for digest auth."""
        parsed = urlparse(rtsp_url)
        if parsed.username and parsed.password:
            return requests.auth.HTTPDigestAuth(parsed.username, parsed.password)
        return None
```

**Step 4: Run test to verify pass**

```bash
pytest tests/test_checker.py -v
# Expected: 3 passed
```

**Step 5: Commit**

```bash
git add src/checker.py tests/test_checker.py
git commit -m "feat: add RTSP health checker with OPTIONS/DESCRIBE/ffprobe methods"
```

---

### Task 4: Alert System (Webhook + Telegram + Email)

**Objective:** Implement alerting with cooldown, deduplication, and multiple channels.

**Files:**
- Create: `src/alerts.py`
- Test: `tests/test_alerts.py`

**Step 1: Write failing test**

```python
# tests/test_alerts.py
import time
from unittest.mock import Mock, patch
from src.alerts import AlertManager, AlertConfig


def test_alert_cooldown():
    config = AlertConfig(
        enabled=True,
        webhook_url="http://test/webhook",
        cooldown_seconds=60,
    )
    manager = AlertManager(config)

    with patch("src.alerts.requests.post") as mock_post:
        mock_post.return_value.status_code = 200

        # First alert should fire
        manager.send_alert(channel=1, alert_type="offline", message="Camera 1 offline")
        assert mock_post.call_count == 1

        # Second alert within cooldown should be suppressed
        manager.send_alert(channel=1, alert_type="offline", message="Camera 1 offline")
        assert mock_post.call_count == 1  # Still 1


def test_alert_recovery_resets_cooldown():
    config = AlertConfig(enabled=True, webhook_url="http://test/webhook", cooldown_seconds=60)
    manager = AlertManager(config)

    with patch("src.alerts.requests.post") as mock_post:
        mock_post.return_value.status_code = 200

        manager.send_alert(channel=1, alert_type="offline", message="Camera 1 offline")
        assert mock_post.call_count == 1

        # Recovery alert should fire regardless of cooldown
        manager.send_alert(channel=1, alert_type="recovered", message="Camera 1 recovered")
        assert mock_post.call_count == 2

        # New offline after recovery should fire
        manager.send_alert(channel=1, alert_type="offline", message="Camera 1 offline again")
        assert mock_post.call_count == 3
```

**Step 2: Run test → fail**

**Step 3: Write src/alerts.py**

```python
# src/alerts.py
import time
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dataclasses import dataclass, field
from typing import Optional, Dict
from threading import Lock


@dataclass
class AlertConfig:
    enabled: bool
    webhook_url: Optional[str]
    cooldown_seconds: int = 900  # 15 min default
    telegram_enabled: bool = False
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    email_enabled: bool = False
    email_smtp_host: Optional[str] = None
    email_smtp_port: int = 587
    email_username: Optional[str] = None
    email_password: Optional[str] = None
    email_to: Optional[str] = None


class AlertManager:
    def __init__(self, config: AlertConfig):
        self.config = config
        self._last_alert: Dict[tuple, float] = {}  # (channel, alert_type) -> timestamp
        self._lock = Lock()

    def send_alert(self, channel: int, alert_type: str, message: str) -> bool:
        """Send alert if not in cooldown. Returns True if sent."""
        if not self.config.enabled:
            return False

        key = (channel, alert_type)
        now = time.time()

        with self._lock:
            # Recovery alerts always fire
            if alert_type == "recovered":
                self._last_alert.pop(key, None)
                return self._dispatch(channel, alert_type, message)

            last = self._last_alert.get(key, 0)
            if now - last < self.config.cooldown_seconds:
                return False  # Suppressed by cooldown

            self._last_alert[key] = now
            return self._dispatch(channel, alert_type, message)

    def _dispatch(self, channel: int, alert_type: str, message: str) -> bool:
        sent = False
        payload = {
            "channel": channel,
            "type": alert_type,
            "message": message,
            "timestamp": time.time(),
        }

        # Webhook
        if self.config.webhook_url:
            try:
                requests.post(self.config.webhook_url, json=payload, timeout=10)
                sent = True
            except Exception:
                pass

        # Telegram
        if self.config.telegram_enabled and self.config.telegram_bot_token and self.config.telegram_chat_id:
            try:
                url = f"https://api.telegram.org/bot{self.config.telegram_bot_token}/sendMessage"
                requests.post(url, json={
                    "chat_id": self.config.telegram_chat_id,
                    "text": f"🚨 *Câmera {channel}*: {message}",
                    "parse_mode": "Markdown"
                }, timeout=10)
                sent = True
            except Exception:
                pass

        # Email
        if self.config.email_enabled and all([
            self.config.email_smtp_host, self.config.email_username,
            self.config.email_password, self.config.email_to
        ]):
            try:
                msg = MIMEMultipart()
                msg["From"] = self.config.email_username
                msg["To"] = self.config.email_to
                msg["Subject"] = f"[DVR Alert] Câmera {channel} - {alert_type.upper()}"
                msg.attach(MIMEText(message, "plain"))

                with smtplib.SMTP(self.config.email_smtp_host, self.config.email_smtp_port) as server:
                    server.starttls()
                    server.login(self.config.email_username, self.config.email_password)
                    server.send_message(msg)
                sent = True
            except Exception:
                pass

        return sent
```

**Step 4: Run test → pass**

**Step 5: Commit**

---

### Task 5: Monitoring Service (Scheduler + Orchestration)

**Objective:** Tie checker, database, alerts together with APScheduler.

**Files:**
- Create: `src/monitor.py`
- Test: `tests/test_monitor.py`

**Step 1: Write failing test**

```python
# tests/test_monitor.py
from unittest.mock import Mock, patch
from src.monitor import MonitorService
from src.config import Config, DVRConfig, MonitoringConfig, AlertConfig, StorageConfig, MetricsConfig, LoggingConfig


def make_test_config():
    return Config(
        dvr=DVRConfig(
            host="192.168.1.100", rtsp_port=554,
            username="admin", password="pass",
            channels=[1, 2],
            rtsp_path_template="/cam/realmonitor?channel={channel}&subtype=0"
        ),
        monitoring=MonitoringConfig(
            check_interval_seconds=30, timeout_seconds=5,
            consecutive_failures_alert=2, cooldown_minutes=5
        ),
        alerts=AlertConfig(
            enabled=True, webhook_url="http://test/webhook",
            telegram_enabled=False, telegram_bot_token=None, telegram_chat_id=None,
            email_enabled=False, email_smtp_host=None, email_smtp_port=587,
            email_username=None, email_password=None, email_to=None
        ),
        storage=StorageConfig(db_path=":memory:", retention_days=7),
        metrics=MetricsConfig(prometheus_enabled=False, prometheus_port=9090),
        logging=LoggingConfig(level="DEBUG", file="test.log", max_bytes=1000, backup_count=1),
    )


def test_monitor_checks_all_channels():
    config = make_test_config()
    service = MonitorService(config)

    with patch.object(service.checker, "check") as mock_check:
        mock_check.return_value = Mock(status="online", response_time_ms=100, error_message=None)

        service._run_check_cycle()

        assert mock_check.call_count == 2  # 2 channels
        # Verify DB was called
        history = service.db.get_recent_health_checks(channel=1, limit=5)
        assert len(history) == 1
        assert history[0].status == "online"


def test_monitor_triggers_alert_after_consecutive_failures():
    config = make_test_config()
    service = MonitorService(config)

    with patch.object(service.checker, "check") as mock_check, \
         patch.object(service.alerts, "send_alert") as mock_alert:

        # First check: online
        mock_check.return_value = Mock(status="online", response_time_ms=100, error_message=None)
        service._run_check_cycle()
        assert mock_alert.call_count == 0

        # Second check: offline (1st failure)
        mock_check.return_value = Mock(status="offline", response_time_ms=None, error_message="timeout")
        service._run_check_cycle()
        assert mock_alert.call_count == 0  # Not yet at threshold

        # Third check: offline (2nd failure = threshold)
        service._run_check_cycle()
        assert mock_alert.call_count == 1
        mock_alert.assert_called_with(channel=1, alert_type="offline", message="Camera 1 offline after 2 consecutive failures")
```

**Step 2: Run test → fail**

**Step 3: Write src/monitor.py**

```python
# src/monitor.py
import logging
import time
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from src.config import Config
from src.database import Database
from src.checker import RTSPHealthChecker
from src.alerts import AlertManager, AlertConfig
from src.models import HealthCheckRecord, AlertRecord


class MonitorService:
    def __init__(self, config: Config):
        self.config = config
        self.logger = self._setup_logging()
        self.db = Database(config.storage.db_path)
        self.checker = RTSPHealthChecker(timeout=config.monitoring.timeout_seconds)
        self.alerts = AlertManager(AlertConfig(
            enabled=config.alerts.enabled,
            webhook_url=config.alerts.webhook_url,
            cooldown_seconds=config.alerts.cooldown_minutes * 60,
            telegram_enabled=config.alerts.telegram_enabled,
            telegram_bot_token=config.alerts.telegram_bot_token,
            telegram_chat_id=config.alerts.telegram_chat_id,
            email_enabled=config.alerts.email_enabled,
            email_smtp_host=config.alerts.email_smtp_host,
            email_smtp_port=config.alerts.email_smtp_port,
            email_username=config.alerts.email_username,
            email_password=config.alerts.email_password,
            email_to=config.alerts.email_to,
        ))
        self.scheduler = BackgroundScheduler()
        self._consecutive_failures = {}  # channel -> count
        self._last_status = {}  # channel -> "online"/"offline"

    def _setup_logging(self):
        logger = logging.getLogger("dvr_monitor")
        logger.setLevel(getattr(logging, self.config.logging.level))
        handler = logging.handlers.RotatingFileHandler(
            self.config.logging.file,
            maxBytes=self.config.logging.max_bytes,
            backupCount=self.config.logging.backup_count,
        )
        handler.setFormatter(logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        ))
        logger.addHandler(handler)
        console = logging.StreamHandler()
        console.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))
        logger.addHandler(console)
        return logger

    def start(self):
        self.logger.info("Starting DVR health monitor")
        self.logger.info(f"Monitoring DVR at {self.config.dvr.host} - channels: {self.config.dvr.channels}")

        # Schedule periodic check
        self.scheduler.add_job(
            self._run_check_cycle,
            IntervalTrigger(seconds=self.config.monitoring.check_interval_seconds),
            id="health_check",
            replace_existing=True,
        )

        # Schedule daily cleanup
        self.scheduler.add_job(
            self._cleanup_old_records,
            IntervalTrigger(hours=24),
            id="cleanup",
            replace_existing=True,
        )

        self.scheduler.start()
        self._run_check_cycle()  # Initial immediate check

        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.logger.info("Shutting down...")
            self.scheduler.shutdown()

    def _run_check_cycle(self):
        self.logger.debug("Starting health check cycle")
        for channel in self.config.dvr.channels:
            self._check_channel(channel)
        self.logger.debug("Health check cycle complete")

    def _check_channel(self, channel: int):
        rtsp_url = self.config.dvr.rtsp_url(channel)
        self.logger.debug(f"Checking channel {channel}: {rtsp_url}")

        result = self.checker.check(rtsp_url)
        timestamp = datetime.utcnow().isoformat()

        # Record to database
        record = HealthCheckRecord(
            channel=channel,
            timestamp=timestamp,
            status=result.status,
            response_time_ms=result.response_time_ms,
            error_message=result.error_message,
        )
        self.db.record_health_check(record)

        # Track consecutive failures
        prev_status = self._last_status.get(channel)
        self._last_status[channel] = result.status

        if result.status == "online":
            self._consecutive_failures[channel] = 0
            if prev_status == "offline":
                # Recovery alert
                self.alerts.send_alert(channel, "recovered", f"Camera {channel} recovered")
                self.db.record_alert(AlertRecord(
                    channel=channel, timestamp=timestamp,
                    alert_type="recovered", message=f"Camera {channel} recovered"
                ))
                self.logger.info(f"Camera {channel} RECOVERED")
        else:
            self._consecutive_failures[channel] = self._consecutive_failures.get(channel, 0) + 1
            failures = self._consecutive_failures[channel]
            self.logger.warning(f"Camera {channel} OFFLINE (failure #{failures}): {result.error_message}")

            # Alert on threshold
            if failures == self.config.monitoring.consecutive_failures_alert:
                msg = f"Camera {channel} offline after {failures} consecutive failures"
                self.alerts.send_alert(channel, "offline", msg)
                self.db.record_alert(AlertRecord(
                    channel=channel, timestamp=timestamp,
                    alert_type="offline", message=msg
                ))

    def _cleanup_old_records(self):
        self.logger.info("Running database cleanup")
        deleted = self.db.cleanup_old_records(self.config.storage.retention_days)
        self.logger.info(f"Cleaned up {deleted} old records")
```

**Step 4: Update src/__main__.py**

```python
# src/__main__.py
"""Intelbras DVR Health Check Monitor - Entry point."""
from src.config import load_config, ensure_dirs
from src.monitor import MonitorService


def main():
    config = load_config()
    ensure_dirs(config)
    service = MonitorService(config)
    service.start()


if __name__ == "__main__":
    main()
```

**Step 5: Run test → pass**

**Step 6: Commit**

---

### Task 6: Prometheus Metrics (Optional)

**Objective:** Expose `/metrics` endpoint for Prometheus scraping.

**Files:**
- Create: `src/metrics.py`
- Modify: `src/monitor.py` (integrate)

**Step 1: Write src/metrics.py**

```python
# src/metrics.py
from prometheus_client import Counter, Histogram, Gauge, start_http_server

health_check_total = Counter(
    "dvr_health_check_total", "Total health checks",
    ["channel", "status"]
)
health_check_duration = Histogram(
    "dvr_health_check_duration_seconds", "Health check duration",
    ["channel"]
)
camera_status = Gauge(
    "dvr_camera_status", "Current camera status (1=online, 0=offline)",
    ["channel"]
)
consecutive_failures = Gauge(
    "dvr_consecutive_failures", "Consecutive failures per camera",
    ["channel"]
)
alerts_sent = Counter(
    "dvr_alerts_sent_total", "Total alerts sent",
    ["channel", "alert_type"]
)


def init_metrics(port: int):
    start_http_server(port)
```

**Step 2: Integrate in monitor.py** (add imports and increment metrics in `_check_channel`)

**Step 3: Commit**

---

### Task 7: Docker Support & systemd Service

**Objective:** Containerize and provide systemd service for production deployment.

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `dvr-monitor.service`

**Dockerfile:**

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/
COPY config.yaml .

RUN mkdir -p /app/data /app/logs

CMD ["python", "-m", "src"]
```

**docker-compose.yml:**

```yaml
version: "3.8"
services:
  dvr-monitor:
    build: .
    container_name: dvr-monitor
    restart: unless-stopped
    volumes:
      - ./config.yaml:/app/config.yaml:ro
      - ./data:/app/data
      - ./logs:/app/logs
    ports:
      - "9090:9090"  # Prometheus metrics
    environment:
      - TZ=America/Sao_Paulo
```

**systemd service:**

```ini
# /etc/systemd/system/dvr-monitor.service
[Unit]
Description=Intelbras DVR Health Monitor
After=network.target

[Service]
Type=simple
User=dvr-monitor
WorkingDirectory=/opt/dvr-monitor
ExecStart=/opt/dvr-monitor/.venv/bin/python -m src
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Step 4: Commit**

---

### Task 8: CLI Commands (Status, History, Test)

**Objective:** Add CLI for manual checks and status queries.

**Files:**
- Create: `src/cli.py`
- Modify: `src/__main__.py` (argparse)

**Commands:**
- `python -m src check` — run single check cycle and print results
- `python -m src status` — show current status of all cameras
- `python -m src history --channel 1 --hours 24` — show history
- `python -m src test-alert` — send test alert

---

### Task 9: Documentation & README

**Objective:** Create comprehensive README with setup, config, deployment.

**Files:**
- Create: `README.md`
- Create: `config.example.yaml`

---

## Validation & Testing Commands

```bash
# 1. Install deps
pip install -r requirements.txt

# 2. Configure
cp config.example.yaml config.yaml
# Edit config.yaml with DVR credentials

# 3. Run single check
python -m src check

# 4. Run as service
python -m src

# 5. Run tests
pytest tests/ -v

# 6. Docker
docker-compose up -d

# 7. Check metrics (if enabled)
curl http://localhost:9090/metrics
```

---

## Risks & Open Questions

| Risk | Mitigation |
|------|------------|
| RTSP auth method (Digest vs Basic) varies by firmware | Checker tries HTTPDigestAuth; fallback to basic if needed |
| DVR may block frequent RTSP OPTIONS requests | Use reasonable interval (30s+); monitor DVR logs |
| Network flakiness causes false alerts | `consecutive_failures_alert` threshold (default 3) + cooldown |
| ffprobe not installed in minimal containers | Dockerfile installs ffmpeg; checker handles missing gracefully |
| Intelbras RTSP path format varies by firmware | Configurable `rtsp_path_template`; default works for Dahua OEM |

---

## Execution Handoff

Plan complete and saved to `.hermes/plans/2026-07-18_143000-intelbras-dvr-health-check-monitor.md`.

Ready to execute using subagent-driven-development — I'll dispatch a fresh subagent per task with two-stage review (spec compliance then code quality). Shall I proceed?