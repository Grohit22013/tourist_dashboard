# backend/create_locations_table.py
from app.models.location import Base
from app.db.session import engine   # <-- adjust to the correct file

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print("Created locations table (if not existing).")
