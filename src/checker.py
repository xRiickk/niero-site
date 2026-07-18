# src/checker.py
import time
import requests
import subprocess
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse
from requests.auth import HTTPDigestAuth


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
        1. RTSP OPTIONS request (lightweight)
        2. RTSP DESCRIBE request (gets SDP)
        3. ffprobe fallback (validates actual stream decode)
        """
        start = time.perf_counter()

        # Method 1: RTSP OPTIONS
        result = self._check_options(rtsp_url)
        if result.status == "online":
            result.response_time_ms = int((time.perf_counter() - start) * 1000)
            return result

        # Method 2: RTSP DESCRIBE
        result = self._check_describe(rtsp_url)
        if result.status == "online":
            result.response_time_ms = int((time.perf_counter() - start) * 1000)
            return result

        # Method 3: ffprobe fallback
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

            url = f"rtsp://{host}:{port}{path}"
            auth = self._extract_auth(rtsp_url)

            resp = self.session.request(
                "OPTIONS", url, timeout=self.timeout, auth=auth
            )
            if resp.status_code in (200, 401, 403):  # Server responded
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
            auth = self._extract_auth(rtsp_url)

            resp = self.session.request(
                "DESCRIBE", url, timeout=self.timeout, auth=auth
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

    def _extract_auth(self, rtsp_url: str):
        """Extract HTTPDigestAuth from rtsp://user:pass@host URL."""
        parsed = urlparse(rtsp_url)
        if parsed.username and parsed.password:
            return HTTPDigestAuth(parsed.username, parsed.password)
        return None