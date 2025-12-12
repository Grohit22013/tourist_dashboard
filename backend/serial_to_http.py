#!/usr/bin/env python3
"""
serial_to_http.py
Read JSON lines from an Arduino over serial and POST to backend.
If POST fails, save to local SQLite outbox and retry periodically.
"""

import serial
import serial.tools.list_ports
import requests
import json
import sqlite3
import time
import argparse
from datetime import datetime

DEFAULT_BAUD = 115200
DEFAULT_BACKEND = "http://127.0.0.1:8000/api/location"
OUTBOX_DB = "serial_outbox.db"
RETRY_INTERVAL = 10  # seconds between retry attempts for queued entries

def now():
    return datetime.now().isoformat()

def init_db(db_path=OUTBOX_DB):
    conn = sqlite3.connect(db_path, check_same_thread=False)
    c = conn.cursor()
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS outbox (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payload TEXT NOT NULL,
            attempts INTEGER DEFAULT 0,
            last_error TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """
    )
    conn.commit()
    return conn

def enqueue(conn, payload_str, err_text=None):
    c = conn.cursor()
    c.execute("INSERT INTO outbox (payload, attempts, last_error) VALUES (?, ?, ?)",
              (payload_str, 0, err_text))
    conn.commit()
    print(f"[{now()}] Enqueued into outbox (id={c.lastrowid})")

def pop_and_post(conn, url, timeout=10):
    """
    Try top-outbox entry (by id asc), attempt POST. On success delete; on failure update attempts & last_error.
    Returns True if processed any entry (success or failure), False if queue empty.
    """
    c = conn.cursor()
    c.execute("SELECT id, payload, attempts FROM outbox ORDER BY id ASC LIMIT 1")
    row = c.fetchone()
    if row is None:
        return False
    _id, payload_str, attempts = row
    try:
        payload = json.loads(payload_str)
    except Exception as e:
        # malformed payload: drop it
        print(f"[{now()}] Dropping malformed outbox payload id={_id}: {e}")
        c.execute("DELETE FROM outbox WHERE id = ?", (_id,))
        conn.commit()
        return True

    try:
        r = requests.post(url, json=payload, timeout=timeout)
        if 200 <= r.status_code < 300:
            print(f"[{now()}] OUTBOX POST OK id={_id} status={r.status_code}")
            c.execute("DELETE FROM outbox WHERE id = ?", (_id,))
            conn.commit()
            return True
        else:
            err = f"HTTP {r.status_code}: {r.text}"
            print(f"[{now()}] OUTBOX POST FAIL id={_id} -> {err}")
            c.execute("UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?", (err, _id))
            conn.commit()
            return True
    except Exception as e:
        err = repr(e)
        print(f"[{now()}] OUTBOX POST EXCEPT id={_id} -> {err}")
        c.execute("UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?", (err, _id))
        conn.commit()
        return True

def list_serial_ports():
    return [p.device for p in serial.tools.list_ports.comports()]

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--port", "-p", required=True, help="Serial port (COMx or /dev/ttyUSBx)")
    p.add_argument("--baud", "-b", type=int, default=DEFAULT_BAUD)
    p.add_argument("--url", "-u", default=DEFAULT_BACKEND)
    p.add_argument("--db", "-d", default=OUTBOX_DB, help="Path to outbox sqlite DB")
    args = p.parse_args()

    print(f"[{now()}] Starting serial_to_http. Looking for port {args.port} @ {args.baud} -> {args.url}")
    conn = init_db(args.db)

    try:
        ser = serial.Serial(args.port, args.baud, timeout=1)
    except Exception as e:
        print(f"[{now()}] ERROR opening serial port {args.port}: {e}")
        print("Available ports:", list_serial_ports())
        return

    print(f"[{now()}] Listening on {args.port}. Ctrl-C to quit.")
    last_retry = 0

    try:
        while True:
            try:
                line = ser.readline().decode("utf-8", errors="ignore").strip()
                if not line:
                    # periodically try to flush outbox
                    if time.time() - last_retry > RETRY_INTERVAL:
                        # attempt one outbox entry per RETRY_INTERVAL loop
                        processed = pop_and_post(conn, args.url)
                        last_retry = time.time()
                    continue

                print(f"[{now()}] [SERIAL] {line}")

                # Attempt parse JSON
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    print(f"[{now()}]  -> Not JSON, skipping")
                    continue

                # basic validation
                if "device_id" not in obj or "status" not in obj:
                    print(f"[{now()}]  -> JSON missing device_id/status, skipping")
                    continue

                # Try to POST
                try:
                    r = requests.post(args.url, json=obj, timeout=10)
                    print(f"[{now()}]  -> POST {r.status_code}: {r.text}")
                    if not (200 <= r.status_code < 300):
                        enqueue(conn, line, err_text=f"HTTP {r.status_code}")
                except Exception as e:
                    print(f"[{now()}]  -> POST error: {e} — enqueuing")
                    enqueue(conn, line, err_text=repr(e))

                # After handling incoming line, attempt to flush 1 outbox item if it's time
                if time.time() - last_retry > RETRY_INTERVAL:
                    processed = pop_and_post(conn, args.url)
                    last_retry = time.time()

            except KeyboardInterrupt:
                print(f"[{now()}] Exiting on user request")
                break
            except Exception as e:
                print(f"[{now()}] Loop exception: {e}")
                time.sleep(1)

    finally:
        ser.close()
        conn.close()

if __name__ == "__main__":
    main()
cl