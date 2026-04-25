"""API launcher for the Outlook add-in integration.

Runs the FastAPI server *and* a cloudflared tunnel as a single foreground
process. Ctrl-C stops both cleanly.

The launcher writes the detected public tunnel URL to `<project>/.tunnel_url`
as soon as cloudflared reports it. The FastAPI app reads that file on each
request, so `draft_pdf_url` in API responses always reflects the *current*
tunnel — no manual .env editing needed.

Configuration in .env:
    API_BASE_URL=https://...trycloudflare.com   # fallback only

Override behaviour via env:
    QUOTING_API_HOST=127.0.0.1
    QUOTING_API_PORT=8000
    QUOTING_DISABLE_TUNNEL=1   # uvicorn only, no cloudflared
    CLOUDFLARED_BIN=cloudflared
    CLOUDFLARED_CONFIG=~/.cloudflared/config.yml
"""
from __future__ import annotations

import atexit
import os
import re
import shutil
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parent
_SRC = _ROOT / "src"
_TUNNEL_FILE = _ROOT / ".tunnel_url"

for p in (_ROOT, _SRC):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

load_dotenv(_ROOT / ".env")

_TRYCLOUDFLARE_RE = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com", re.IGNORECASE)


def _resolve_cloudflared() -> str | None:
    """Find the cloudflared binary, or None if not installed."""
    explicit = os.getenv("CLOUDFLARED_BIN")
    if explicit:
        return explicit if shutil.which(explicit) or Path(explicit).exists() else None
    return shutil.which("cloudflared")


def _cloudflared_cmd(local_url: str) -> list[str]:
    """Build the cloudflared invocation."""
    bin_path = _resolve_cloudflared()
    assert bin_path, "cloudflared not found"

    config = os.getenv("CLOUDFLARED_CONFIG")
    if not config:
        default_cfg = Path.home() / ".cloudflared" / "config.yml"
        if default_cfg.exists():
            config = str(default_cfg)

    if config:
        # Named tunnel via config file — hostname is pinned in that file.
        print(f"[tunnel] Using cloudflared config: {config}")
        return [bin_path, "tunnel", "--config", config, "run"]

    # Quick tunnel: random *.trycloudflare.com URL each run.
    print("[tunnel] No config file found — using quick tunnel (random URL).")
    return [bin_path, "tunnel", "--url", local_url, "--no-autoupdate"]


def _publish_tunnel_url(url: str) -> None:
    """Write the live tunnel URL where the API can find it."""
    try:
        _TUNNEL_FILE.write_text(url, encoding="utf-8")
        # Also export for any non-reload child that reads it at startup.
        os.environ["API_BASE_URL"] = url
        print(f"[tunnel] Wrote {_TUNNEL_FILE.name}: {url}")
    except Exception as e:
        print(f"[tunnel] WARNING: could not write {_TUNNEL_FILE}: {e}")


def _clear_tunnel_url() -> None:
    """Remove stale tunnel file on shutdown so a crashed run can't mislead."""
    try:
        if _TUNNEL_FILE.exists():
            _TUNNEL_FILE.unlink()
            print(f"[tunnel] Removed stale {_TUNNEL_FILE.name}")
    except Exception as e:
        print(f"[tunnel] WARNING: could not remove {_TUNNEL_FILE}: {e}")


def _start_tunnel(local_url: str, expected_base: str | None) -> subprocess.Popen | None:
    """Start cloudflared and watch its stderr for the public URL."""
    if not _resolve_cloudflared():
        print(
            "[tunnel] cloudflared not found in PATH. Skipping tunnel.\n"
            "         Install: https://developers.cloudflare.com/cloudflared/\n"
            "         Or run with QUOTING_DISABLE_TUNNEL=1 to silence this."
        )
        return None

    # Wipe any leftover URL from a previous run before we start.
    _clear_tunnel_url()

    cmd = _cloudflared_cmd(local_url)
    print(f"[tunnel] Starting: {' '.join(cmd)}")
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    expected_host = urlparse(expected_base).hostname if expected_base else None

    def _pump():
        announced = False
        for line in proc.stdout:  # type: ignore[union-attr]
            sys.stdout.write(f"[cloudflared] {line}")
            if announced:
                continue
            m = _TRYCLOUDFLARE_RE.search(line)
            if not m:
                continue
            announced = True
            actual = m.group(0)
            actual_host = urlparse(actual).hostname

            # ALWAYS publish the actual URL — that's the whole point.
            _publish_tunnel_url(actual)

            if expected_host and actual_host != expected_host:
                print(
                    f"[tunnel] Note: cloudflared opened {actual}, "
                    f"which differs from API_BASE_URL in .env "
                    f"({expected_host}). The .tunnel_url file takes precedence, "
                    f"so this is fine."
                )
            else:
                print(f"[tunnel] Public URL: {actual}")

    threading.Thread(target=_pump, daemon=True).start()
    return proc


def _shutdown(proc: subprocess.Popen | None) -> None:
    _clear_tunnel_url()
    if proc is None or proc.poll() is not None:
        return
    print("[tunnel] Stopping cloudflared...")
    try:
        if os.name == "nt":
            proc.send_signal(signal.CTRL_BREAK_EVENT)  # type: ignore[attr-defined]
        else:
            proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
    except Exception as e:
        print(f"[tunnel] Error stopping cloudflared: {e}")


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("QUOTING_API_HOST", "127.0.0.1")
    port = int(os.getenv("QUOTING_API_PORT", "8000"))
    api_base = os.getenv("API_BASE_URL")

    if not api_base:
        print(
            "[run_review_api] Note: API_BASE_URL is not set in .env. "
            "That's fine — the launcher will write the live tunnel URL to "
            ".tunnel_url and the API will pick it up automatically."
        )

    tunnel_proc: subprocess.Popen | None = None
    if not os.getenv("QUOTING_DISABLE_TUNNEL"):
        tunnel_proc = _start_tunnel(f"http://{host}:{port}", api_base)

    atexit.register(_shutdown, tunnel_proc)

    # Tiny delay so the tunnel banner appears before uvicorn's logs.
    time.sleep(0.3)

    try:
        uvicorn.run(
            "quoting.api.review_api:app",
            host=host,
            port=port,
            reload=True,
        )
    finally:
        _shutdown(tunnel_proc)
