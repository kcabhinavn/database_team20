// Assignment 2 (Team 20): indexes and validators the web front end relies on.
// Safe to re-run.   mongosh ridesync mongo/04_a2_indexes_and_validators.js
// See docs/handover_note.md (#11, #12).
db = db.getSiblingDB('ridesync');

// Per-vehicle review summary ($facet with vehicle_id in $match) and review lists.
db.TripReviews.createIndex({ vehicle_id: 1, rating: 1 });
db.TripReviews.createIndex({ trip_id: 1 });
db.TripReviews.createIndex({ created_at: -1 });

// One catalog document per vehicle, looked up by vehicle_id.
db.VehicleMetadata.createIndex({ vehicle_id: 1 }, { unique: true });

// Bring the validators in line with docs/mongo_schema_map.json.
db.runCommand({
  collMod: 'VehicleMetadata',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['vehicle_id', 'inspection_records', 'features'],
      properties: {
        vehicle_id: { bsonType: 'string' },
        features: { bsonType: 'array', items: { bsonType: 'string' } },
        inspection_records: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['passed', 'inspected_at'],
            properties: {
              passed: { bsonType: 'bool' },
              inspected_at: { bsonType: 'date' },
              inspector: { bsonType: 'string' }
            }
          }
        }
      }
    }
  }
});

db.runCommand({
  collMod: 'TripReviews',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['trip_id', 'rider_id', 'rating', 'tags', 'created_at'],
      properties: {
        trip_id: { bsonType: 'string' },
        rider_id: { bsonType: 'string' },
        vehicle_id: { bsonType: 'string' },
        rating: { bsonType: 'int', minimum: 1, maximum: 5 },
        tags: { bsonType: 'array', items: { bsonType: 'string' } },
        comment: { bsonType: 'string' },
        created_at: { bsonType: 'date' }
      }
    }
  }
});
