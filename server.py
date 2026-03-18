from __future__ import annotations

import hashlib
import http.cookies
import json
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

HOST = "127.0.0.1"
PORT = 4173
DB_PATH = Path("amped_up.db")
SESSION_COOKIE = "amped_session"
SESSION_TTL_HOURS = 8

ADMIN_USERNAME = "Adm1n"
ADMIN_PASSWORD = "!2345678"

DEFAULT_PRODUCTS = [
    {
        "name": "Smart Panel Upgrade",
        "description": "Increase capacity, safety, and monitoring with a modern smart-ready panel.",
    },
    {
        "name": "EV Fast Charger Bundle",
        "description": "Level 2 charger + dedicated circuit + permit assistance for reliable home charging.",
    },
    {
        "name": "Whole-Home Surge Shield",
        "description": "Protect electronics and appliances from sudden voltage spikes and outages.",
    },
]


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                expires_at TEXT NOT NULL
            )
            """
        )
        count = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        if count == 0:
            for index, product in enumerate(DEFAULT_PRODUCTS, start=1):
                conn.execute(
                    "INSERT INTO products(id, name, description) VALUES(?, ?, ?)",
                    (index, product["name"], product["description"]),
                )


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def read_products() -> list[dict[str, str]]:
    with get_db() as conn:
        rows = conn.execute("SELECT id, name, description FROM products ORDER BY id ASC").fetchall()
    return [{"id": row["id"], "name": row["name"], "description": row["description"]} for row in rows]


def update_products(products: list[dict[str, Any]]) -> None:
    with get_db() as conn:
        conn.execute("DELETE FROM products")
        for index, product in enumerate(products, start=1):
            conn.execute(
                "INSERT INTO products(id, name, description) VALUES(?, ?, ?)",
                (index, product["name"], product["description"]),
            )


def create_session() -> str:
    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_token(raw_token)
    expiry = datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS)

    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO sessions(token_hash, expires_at) VALUES(?, ?)",
            (token_hash, expiry.isoformat()),
        )

    return raw_token


def destroy_session(raw_token: str | None) -> None:
    if not raw_token:
        return

    with get_db() as conn:
        conn.execute("DELETE FROM sessions WHERE token_hash = ?", (hash_token(raw_token),))


def is_authenticated(raw_token: str | None) -> bool:
    if not raw_token:
        return False

    token_hash = hash_token(raw_token)
    now = datetime.now(timezone.utc)

    with get_db() as conn:
        row = conn.execute(
            "SELECT expires_at FROM sessions WHERE token_hash = ?",
            (token_hash,),
        ).fetchone()

        if not row:
            return False

        expiry = datetime.fromisoformat(row["expires_at"])
        if expiry <= now:
            conn.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))
            return False

    return True


class AppHandler(SimpleHTTPRequestHandler):
    def _parse_json_body(self) -> dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length) if content_length > 0 else b"{}"
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            return {}

    def _send_json(self, payload: dict[str, Any], status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _get_session_cookie(self) -> str | None:
        cookie_header = self.headers.get("Cookie")
        if not cookie_header:
            return None

        cookie = http.cookies.SimpleCookie()
        cookie.load(cookie_header)
        morsel = cookie.get(SESSION_COOKIE)
        return morsel.value if morsel else None

    def _set_session_cookie(self, token: str) -> None:
        cookie = http.cookies.SimpleCookie()
        cookie[SESSION_COOKIE] = token
        cookie[SESSION_COOKIE]["path"] = "/"
        cookie[SESSION_COOKIE]["httponly"] = True
        cookie[SESSION_COOKIE]["samesite"] = "Strict"
        self.send_header("Set-Cookie", cookie.output(header="").strip())

    def _clear_session_cookie(self) -> None:
        cookie = http.cookies.SimpleCookie()
        cookie[SESSION_COOKIE] = ""
        cookie[SESSION_COOKIE]["path"] = "/"
        cookie[SESSION_COOKIE]["httponly"] = True
        cookie[SESSION_COOKIE]["samesite"] = "Strict"
        cookie[SESSION_COOKIE]["max-age"] = 0
        self.send_header("Set-Cookie", cookie.output(header="").strip())

    def do_GET(self) -> None:
        if self.path == "/api/products":
            self._send_json({"products": read_products()})
            return

        if self.path == "/api/session":
            authenticated = is_authenticated(self._get_session_cookie())
            self._send_json({"authenticated": authenticated})
            return

        return super().do_GET()

    def do_POST(self) -> None:
        if self.path == "/api/login":
            payload = self._parse_json_body()
            username = str(payload.get("username", "")).strip()
            password = str(payload.get("password", ""))

            if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
                token = create_session()
                self.send_response(HTTPStatus.OK)
                self._set_session_cookie(token)
                body = json.dumps({"ok": True}).encode("utf-8")
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            self._send_json({"error": "Invalid credentials."}, HTTPStatus.UNAUTHORIZED)
            return

        if self.path == "/api/logout":
            raw_token = self._get_session_cookie()
            destroy_session(raw_token)
            self.send_response(HTTPStatus.OK)
            self._clear_session_cookie()
            body = json.dumps({"ok": True}).encode("utf-8")
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if self.path == "/api/admin/products":
            if not is_authenticated(self._get_session_cookie()):
                self._send_json({"error": "Unauthorized."}, HTTPStatus.UNAUTHORIZED)
                return

            payload = self._parse_json_body()
            products = payload.get("products")

            if not isinstance(products, list) or len(products) != 3:
                self._send_json({"error": "Expected exactly 3 products."}, HTTPStatus.BAD_REQUEST)
                return

            normalized = []
            for item in products:
                name = str(item.get("name", "")).strip()
                description = str(item.get("description", "")).strip()
                if not name or not description:
                    self._send_json(
                        {"error": "Each product must include a name and description."},
                        HTTPStatus.BAD_REQUEST,
                    )
                    return
                normalized.append({"name": name, "description": description})

            update_products(normalized)
            self._send_json({"ok": True, "products": read_products()})
            return

        self._send_json({"error": "Not found."}, HTTPStatus.NOT_FOUND)


def main() -> None:
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    print(f"Serving on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
