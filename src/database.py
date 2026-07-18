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
            conn.commit()
        except Exception:
            conn.rollback()
            raise
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