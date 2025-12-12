# simple in-memory storage for now
database = {}
# app/db/fake_db.py

# In-memory storage for demo purposes
# Keyed by phone number
USERS: dict = {}

def save_tourist(data: dict, digital_id: str):
    database[digital_id] = data

def get_tourist(digital_id: str):
    return database.get(digital_id)
