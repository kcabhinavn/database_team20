"""
Usage:
  python data_generation/mongo_seeder.py
  python data_generation/mongo_seeder.py --reset
  python data_generation/mongo_seeder.py --reset --pings-only   # [A2] refresh expired pings (~10 s)
"""

from __future__ import annotations

import argparse
import os
import random
import uuid
from datetime import datetime, timedelta, timezone

from faker import Faker
from pymongo import MongoClient, InsertOne

try:
    import psycopg2
except ImportError:
    psycopg2 = None

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "ridesync"

PG_CONFIG = {
    "host": os.getenv("PGHOST", "localhost"),
    "port": int(os.getenv("PGPORT", "5433")),  # [A2] docker-compose publishes Postgres on 5433
    "dbname": os.getenv("PGDATABASE", "ridesync"),
    "user": os.getenv("PGUSER", "ridesync"),
    "password": os.getenv("PGPASSWORD", "ridesync"),
}

NUM_PINGS = 500_000
NUM_REVIEWS = 25_000
BATCH_SIZE = 5_000
SEED = 42

# Same point as mongo/02_workflow3_geonear.js (San Francisco)
GEO_NEAR_LNG = -122.4194
GEO_NEAR_LAT = 37.7749

FEEDBACK_TAGS = [
    "Smooth Driving",
    "Clean Car",
    "Polite",
    "On Time",
    "Safe",
    "Music Too Loud",
    "Late Pickup",
    "Helpful",
]
VEHICLE_FEATURES = [
    "sunroof",
    "child_seat",
    "usb_charger",
    "wifi",
    "wheelchair_access",
    "premium_audio",
]

random.seed(SEED)
fake = Faker()
Faker.seed(SEED)


def load_vehicle_ids() -> list[str]:
    if psycopg2 is None:
        print("psycopg2 not available; generating synthetic vehicle_ids.")
        return [str(uuid.uuid4()) for _ in range(500)]
    try:
        conn = psycopg2.connect(**PG_CONFIG)
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT id::text FROM vehicles")
                ids = [row[0] for row in cur.fetchall()]
        finally:
            conn.close()
        if ids:
            print(f"Using {len(ids)} vehicle_id values from PostgreSQL.")
            return ids
        print("No vehicles in PostgreSQL; generating synthetic vehicle_ids.")
    except Exception as exc:
        print(f"Could not read vehicles from PostgreSQL ({exc}); using synthetic ids.")
    return [str(uuid.uuid4()) for _ in range(500)]


def load_trip_ids() -> list[tuple[str, str, str]]:
    """Return (trip_id, rider_id, vehicle_id) from Postgres when available."""
    if psycopg2 is None:
        return []
    try:
        conn = psycopg2.connect(**PG_CONFIG)
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id::text, rider_id::text, vehicle_id::text
                    FROM trips
                    WHERE status = 'COMPLETED'
                    LIMIT 25000
                    """
                )
                rows = cur.fetchall()
        finally:
            conn.close()
        print(f"Using {len(rows)} completed trips from PostgreSQL for reviews.")
        return rows
    except Exception as exc:
        print(f"Could not read trips from PostgreSQL ({exc}).")
        return []


def on_land(lng: float, lat: float) -> bool:
    """[A2] Very rough San Francisco land mask so demo vehicles are not parked in the bay."""
    if not (37.712 <= lat <= 37.805 and -122.505 <= lng):
        return False
    if lat >= 37.79:  # north-east waterfront bends west towards Fisherman's Wharf
        return lng <= -122.389 - (lat - 37.79) * 0.9
    return lng <= (-122.390 if lat >= 37.775 else -122.387)


def vehicle_home() -> tuple[float, float]:
    """[A2] Home point for one vehicle: ~1.8 km spread around GEO_NEAR, on land."""
    while True:
        lng = GEO_NEAR_LNG + random.gauss(0, 0.020)
        lat = GEO_NEAR_LAT + random.gauss(0, 0.016)
        if on_land(lng, lat):
            return lng, lat


def seed_vehicle_metadata(coll, vehicle_ids: list[str], reset: bool) -> None:
    if reset:
        coll.delete_many({})
    now = datetime.now(timezone.utc)
    docs = []
    for vid in vehicle_ids:
        n_insp = random.randint(1, 4)
        docs.append(
            {
                "vehicle_id": vid,
                "features": random.sample(VEHICLE_FEATURES, k=random.randint(1, 3)),
                "inspection_records": [
                    {
                        "passed": random.random() > 0.1,
                        "inspected_at": now - timedelta(days=random.randint(1, 400)),
                        "inspector": fake.name(),
                    }
                    for _ in range(n_insp)
                ],
            }
        )
    if docs:
        coll.insert_many(docs, ordered=False)
    print(f"VehicleMetadata: {len(docs)} documents")


def seed_reviews(coll, vehicle_ids: list[str], trip_rows: list, reset: bool) -> None:
    if reset:
        coll.delete_many({})
    now = datetime.now(timezone.utc)
    docs = []
    for i in range(NUM_REVIEWS):
        if trip_rows:
            trip_id, rider_id, vehicle_id = trip_rows[i % len(trip_rows)]
        else:
            trip_id = str(uuid.uuid4())
            rider_id = str(uuid.uuid4())
            vehicle_id = random.choice(vehicle_ids)
        n_tags = random.randint(1, 3)
        docs.append(
            {
                "trip_id": trip_id,
                "rider_id": rider_id,
                "vehicle_id": vehicle_id,
                "rating": int(random.choices([1, 2, 3, 4, 5], weights=[4, 6, 15, 35, 40])[0]),
                "tags": random.sample(FEEDBACK_TAGS, k=n_tags),
                "comment": fake.sentence(nb_words=10),
                "created_at": now - timedelta(days=random.randint(0, 29)),
            }
        )
        if len(docs) >= BATCH_SIZE:
            coll.insert_many(docs, ordered=False)
            print(f"  TripReviews {i + 1}/{NUM_REVIEWS}")
            docs = []
    if docs:
        coll.insert_many(docs, ordered=False)
    print(f"TripReviews: {NUM_REVIEWS} documents")


# [A2 fix] Pings used to be scattered randomly over the whole city for every
# vehicle, so each vehicle's *nearest* ping was always metres from any origin
# and the map showed every vehicle on top of the origin (handover note #10).
# Now each vehicle moves in a small bounded random walk around its own home
# point (homes are spread around the Part A origin, on land), with
# availability that changes in runs instead of independently per ping.
WALK_STEP_DEG = 0.00016     # ~18 m between consecutive pings
WALK_PULL = 0.1             # pull back towards home; keeps the walk within ~40 m
P_AVAILABLE_TO_BUSY = 0.01  # stationary availability = 0.03 / 0.04 = 75 %
P_BUSY_TO_AVAILABLE = 0.03


def vehicle_track(vehicle_id: str, n: int, now: datetime) -> list[dict]:
    home_lng, home_lat = vehicle_home()
    lng, lat = home_lng, home_lat
    available = random.random() < 0.75
    docs = []
    for k in range(n):
        lng += random.gauss(0, WALK_STEP_DEG) - WALK_PULL * (lng - home_lng)
        lat += random.gauss(0, WALK_STEP_DEG) - WALK_PULL * (lat - home_lat)
        if available and random.random() < P_AVAILABLE_TO_BUSY:
            available = False
        elif not available and random.random() < P_BUSY_TO_AVAILABLE:
            available = True
        # Evenly spread over the last 90 minutes, oldest first.
        created = now - timedelta(minutes=90 * (n - k) / n) + timedelta(seconds=random.uniform(0, 1))
        docs.append(
            {
                "vehicle_id": vehicle_id,
                "location": {"type": "Point", "coordinates": [float(lng), float(lat)]},
                "is_available": available,
                "speed_kmh": float(round(random.uniform(0, 60), 1)),
                "created_at": created,
            }
        )
    return docs


def seed_pings(coll, vehicle_ids: list[str], reset: bool) -> None:
    if reset:
        coll.delete_many({})
    now = datetime.now(timezone.utc)
    per_vehicle, extra = divmod(NUM_PINGS, len(vehicle_ids))
    inserted = 0
    batch: list = []
    for idx, vid in enumerate(vehicle_ids):
        for doc in vehicle_track(vid, per_vehicle + (1 if idx < extra else 0), now):
            batch.append(InsertOne(doc))
            if len(batch) >= BATCH_SIZE:
                coll.bulk_write(batch, ordered=False)
                inserted += len(batch)
                batch = []
                if inserted % 50_000 == 0:
                    print(f"  TelemetryPings {inserted}/{NUM_PINGS}")
    if batch:
        coll.bulk_write(batch, ordered=False)
        inserted += len(batch)
    print(f"TelemetryPings: {inserted} documents")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed RideSync MongoDB data.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete existing documents in the three collections first.",
    )
    parser.add_argument(
        "--pings-only",
        action="store_true",
        help="[A2] Only re-seed TelemetryPings (they expire after 2 h because of the TTL index).",
    )
    args = parser.parse_args()

    vehicle_ids = load_vehicle_ids()

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    try:
        if not args.pings_only:
            trip_rows = load_trip_ids()
            seed_vehicle_metadata(db["VehicleMetadata"], vehicle_ids, args.reset)
            seed_reviews(db["TripReviews"], vehicle_ids, trip_rows, args.reset)
        seed_pings(db["TelemetryPings"], vehicle_ids, args.reset)

        print("\nCollection counts:")
        for name in ("VehicleMetadata", "TripReviews", "TelemetryPings"):
            print(f"  {name}: {db[name].count_documents({})}")
    finally:
        client.close()


if __name__ == "__main__":
    main()
