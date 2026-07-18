# tests/test_checker.py
import pytest
from unittest.mock import Mock, patch
from src.checker import RTSPHealthChecker, CheckResult


def test_checker_online_with_options():
    checker = RTSPHealthChecker(timeout=5)
    with patch("src.checker.requests.Session.request") as mock_request:
        mock_resp = Mock()
        mock_resp.status_code = 200
        mock_request.return_value = mock_resp

        result = checker.check("rtsp://user:pass@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0")
        assert result.status == "online"
        assert result.response_time_ms is not None
        assert result.error_message is None


def test_checker_online_with_describe():
    checker = RTSPHealthChecker(timeout=5)
    with patch("src.checker.requests.Session.request") as mock_request:
        # First call (OPTIONS) returns 404, second (DESCRIBE) returns 200 with SDP
        mock_resp1 = Mock()
        mock_resp1.status_code = 404
        mock_resp2 = Mock()
        mock_resp2.status_code = 200
        mock_resp2.headers = {"Content-Type": "application/sdp"}
        mock_request.side_effect = [mock_resp1, mock_resp2]

        result = checker.check("rtsp://user:pass@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0")
        assert result.status == "online"
        assert result.response_time_ms is not None
        assert mock_request.call_count == 2


def test_checker_offline_timeout():
    checker = RTSPHealthChecker(timeout=5)
    with patch("src.checker.requests.Session.request") as mock_request:
        import requests
        mock_request.side_effect = requests.Timeout()

        result = checker.check("rtsp://user:pass@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0")
        assert result.status == "offline"
        assert "timeout" in result.error_message.lower()


def test_checker_offline_connection_refused():
    checker = RTSPHealthChecker(timeout=5)
    with patch("src.checker.requests.Session.request") as mock_request, \
         patch("src.checker.subprocess.run") as mock_run:
        import requests
        mock_request.side_effect = requests.ConnectionError("Connection refused")

        # ffprobe should also fail quickly
        mock_run.return_value = Mock(returncode=1, stdout="", stderr="connection refused")

        result = checker.check("rtsp://user:pass@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0")
        assert result.status == "offline"
        assert "connection" in result.error_message.lower()


def test_checker_fallback_to_ffprobe():
    checker = RTSPHealthChecker(timeout=5)
    with patch("src.checker.requests.Session.request") as mock_request, \
         patch("src.checker.subprocess.run") as mock_run:
        # Both OPTIONS and DESCRIBE fail
        mock_resp = Mock()
        mock_resp.status_code = 500
        mock_request.return_value = mock_resp

        # ffprobe succeeds
        mock_run.return_value = Mock(returncode=0, stdout="h264", stderr="")

        result = checker.check("rtsp://user:pass@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0")
        assert result.status == "online"
        assert mock_run.called


def test_checker_all_methods_fail():
    checker = RTSPHealthChecker(timeout=5)
    with patch("src.checker.requests.Session.request") as mock_request, \
         patch("src.checker.subprocess.run") as mock_run:
        mock_resp = Mock()
        mock_resp.status_code = 500
        mock_request.return_value = mock_resp

        mock_run.return_value = Mock(returncode=1, stdout="", stderr="ffprobe error")

        result = checker.check("rtsp://user:pass@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0")
        assert result.status == "offline"
        assert result.error_message is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])