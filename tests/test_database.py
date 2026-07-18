# tests/test_database.py
import tempfile
import os
import sqlite3
from src.database import Database, HealthCheckRecord, AlertRecord


def test_database_creates_tables():
    db_path = os.path.join(tempfile.gettempdir(), f"test_{os.getpid()}.db")
    try:
        db = Database(db_path)
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {row[0] for row in cursor.fetchall()}
        assert "health_checks" in tables
        assert "alerts" in tables
        conn.close()
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_record_health_check():
    db_path = os.path.join(tempfile.gettempdir(), f"test_{os.getpid()}_2.db")
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
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_record_alert():
    db_path = os.path.join(tempfile.gettempdir(), f"test_{os.getpid()}_3.db")
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
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_consecutive_failures():
    db_path = os.path.join(tempfile.gettempdir(), f"test_{os.getpid()}_4.db")
    try:
        db = Database(db_path)
        # Insert in chronological order (oldest first)
        # The query orders by timestamp DESC, so newest first
        base_time = "2026-07-18T10:00:00"
        for i, status in enumerate(["online", "offline", "offline", "offline"]):
            db.record_health_check(HealthCheckRecord(
                channel=1,
                timestamp=f"2026-07-18T10:00:{i:02d}",
                status=status,
                response_time_ms=100 if status == "online" else None,
                error_message="timeout" if status == "offline" else None,
            ))
        # Should count 3 consecutive failures (last 3 are offline)
        failures = db.get_consecutive_failures(1)
        assert failures == 3
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


if __name__ == "__main__":
    test_database_creates_tables()
    print("✓ test_database_creates_tables passed")
    test_record_health_check()
    print("✓ test_record_health_check passed")
    test_record_alert()
    print("✓ test_record_alert passed")
    test_consecutive_failures()
    print("✓ test_consecutive_failures passed")
    print("\n✅ All tests passed!")