# backend/migrate_locations_nullable.py
import sqlite3
import os
import sys
from datetime import datetime

DB = "tourists.db"
BACKUP = f"tourists.db.migrate_backup_{datetime.now().strftime('%Y%m%d%H%M%S')}.bak"

if not os.path.exists(DB):
    print("Database file not found:", DB)
    sys.exit(1)

# 1) backup
print("Backing up", DB, "to", BACKUP)
import shutil
shutil.copy2(DB, BACKUP)

conn = sqlite3.connect(DB)
c = conn.cursor()

# 2) show current schema
print("Existing schema for 'locations':")
for row in c.execute("PRAGMA table_info(locations);"):
    print(row)

# 3) Create new table with desired schema (nullable lat/lon)
# Use a temporary name to avoid conflicts
new_table = "locations_new"

print("\nCreating new table:", new_table)
c.execute(f"""
CREATE TABLE IF NOT EXISTS {new_table} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    status TEXT,
    lat REAL,    -- nullable
    lon REAL,    -- nullable
    sats INTEGER,
    utc TEXT,
    created_at DATETIME
);
""")
conn.commit()

# 4) copy data from old table to new table, mapping columns that exist
# We'll select columns that exist in the old table and insert into matching columns.
cols_info = [r[1] for r in c.execute("PRAGMA table_info(locations);")]
print("\nOld columns detected:", cols_info)

# Build select list for columns that exist in both tables
common_cols = []
for col in ("id","device_id","status","lat","lon","sats","utc","created_at"):
    if col in cols_info:
        common_cols.append(col)

if not common_cols:
    print("No common columns found -- aborting.")
    conn.close()
    sys.exit(1)

col_list = ",".join(common_cols)
print("Copying columns:", col_list)

# Copy rows into new table. We will NOT copy the old id to preserve autoincrement behavior if id exists.
# But if id present in both, we should copy it to keep continuity. We'll attempt to copy id if present.
try:
    c.execute(f"INSERT INTO {new_table} ({col_list}) SELECT {col_list} FROM locations;")
    conn.commit()
    print("Copied rows successfully.")
except Exception as e:
    print("Error copying rows:", e)
    conn.rollback()
    conn.close()
    sys.exit(1)

# 5) Drop old table and rename new table
print("Dropping old table 'locations' and renaming new table.")
try:
    c.execute("DROP TABLE locations;")
    c.execute(f"ALTER TABLE {new_table} RENAME TO locations;")
    conn.commit()
    print("Renamed table successfully.")
except Exception as e:
    print("Error during rename:", e)
    conn.rollback()
    print("Restoring backup and exiting.")
    conn.close()
    shutil.copy2(BACKUP, DB)
    sys.exit(1)

# 6) Verify final schema
print("\nFinal schema for 'locations':")
for row in c.execute("PRAGMA table_info(locations);"):
    print(row)

conn.close()
print("\nMigration complete. Backup saved as:", BACKUP)
