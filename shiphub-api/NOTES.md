# Migration and Read Comparison

# Before Migration

**ORD-LEGACY-002**

Mongoose read showed `priority: 'normal'` because of the schema default.
Raw MongoDB read did not show the priority field.
Raw normal priority count was 2


Mongoose read:
{
  priority: 'normal',
  _id: new ObjectId('6ae8bb28a070d5c62b104ff8'),
  id: 'ORD-LEGACY-002',
  customer: 'Test Customer 2',
  product: 'Test Product 2',
  status: 'Pending'
}
Raw MongoDB read:
{
  _id: new ObjectId('6ae8b9f75f32095b3be9436c'),
  id: 'ORD-LEGACY-002'ye s,
  customer: 'Test Customer',
  product: 'Test Product',
  status: 'Pending'
}
Raw normal priority count: 2

# Migration Result

Priority migration completed
Documents matched: 1
Documents modified: 1

# After Migration – ORD-LEGACY-002

Mongoose read:
{
  _id: new ObjectId('6ae8bb28a070d5c62b104ff8'),
  id: 'ORD-LEGACY-002',
  customer: 'Test Customer 2',
  product: 'Test Product 2',
  status: 'Pending',
  priority: 'normal'
}
Raw MongoDB read:
{
  _id: new ObjectId('6ae8bb28a070d5c62b104ff8'),
  id: 'ORD-LEGACY-002',
  customer: 'Test Customer 2',
  product: 'Test Product 2',
  status: 'Pending',
  priority: 'normal'
}
Raw normal priority count: 3


# Query Optimization and Indexing

Query Used

Order.find({ priority: 'high' })
  .sort({ createdAt: -1, id: 1 })
  .limit(20);

Index Created

{
  priority: 1,
  createdAt: -1,
  id: 1
}

# Before Index

Query plan: COLLSCAN
Documents examined: 50,003
Index keys examined: 0
Documents returned: 20
Execution time: 20ms

# After Index

Query plan: IXSCAN
Documents examined: 20
Index keys examined: 20
Documents returned: 20
Execution time: 9ms


# Observation

Before indexing, MongoDB performed a collection scan and examined 50,003 documents.

After creating the compound index, MongoDB used an index scan and examined only 20 documents to return 20 results.

The compound index supports the priority filter and the requested sort order. It improves query efficiency, but indexes require additional storage and can increase write overhead



# Idempotency and API Restart Test

Test details:

Idempotency key: test-key-001

Customer: Bhuvana

Product: Test Product

Order ID: ORD-1793695798415

# First POST request

HTTP/1.1 201 Created
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 189
ETag: W/"bd-xulb8RmkNtTIwwImSFLA4pCb4T4"
Date: Tue, 03 Nov 2026 08:49:58 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"ORD-1793695798415","customer":"Bhuvana","product":"Test Product","status":"Pending","priority":"normal","createdAt":"2026-11-03T08:49:58.419Z","updatedAt":"2026-11-03T08:49:58.419Z"}

# Repeated POST with same key

HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 189
ETag: W/"bd-xulb8RmkNtTIwwImSFLA4pCb4T4"
Date: Tue, 03 Nov 2026 08:50:43 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"ORD-1793695798415","customer":"Bhuvana","product":"Test Product","status":"Pending","priority":"normal","createdAt":"2026-11-03T08:49:58.419Z","updatedAt":"2026-11-03T08:49:58.419Z"}

# GET order by ID

HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 189
ETag: W/"bd-xulb8RmkNtTIwwImSFLA4pCb4T4"
Date: Tue, 03 Nov 2026 08:52:11 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"ORD-1793695798415","customer":"Bhuvana","product":"Test Product","status":"Pending","priority":"normal","createdAt":"2026-11-03T08:49:58.419Z","updatedA}

# Repeated POST after API restart

HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 189
ETag: W/"bd-xulb8RmkNtTIwwImSFLA4pCb4T4"
Date: Tue, 03 Nov 2026 08:52:57 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"ORD-1793695798415","customer":"Bhuvana","product":"Test Product","status":"Pending","priority":"normal","createdAt":"2026-11-03T08:49:58.419Z","updated"}

Idempotency works across API restarts because the idempotency key is stored in MongoDB. Repeated requests with the same key return the existing order instead of creating another one.

# Creating Another Order After Restart

HTTP/1.1 201 Created
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 197
ETag: W/"c5-noPyn5n2P40+3El9LFeN6key1ZI"
Date: Tue, 03 Nov 2026 09:13:52 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"ORD-1793697232330","customer":"Bhuvana","product":"Another Test Product","status":"Pending","priority":"normal","createdAt":"2026-11-03T09:13:52.332Z","updatedAt":"2026-11-03T09:13:52.332Z"}

# Automated Testing

Test database: shiphub_test

Executed npm test using Node.js built-in test runner

npm test

> shiphub-api@1.0.0 test
> MONGODB_URI=mongodb://127.0.0.1:27017/shiphub_test node --test

[2026-11-03T09:21:30.577Z] [WARN] GET /orders - Invalid priority. Allowed values are low, normal, high
[2026-11-03T09:21:30.580Z] [WARN] GET /orders - Status: 400 - 5ms
✔ rejects an invalid priority (68.426823ms)
[2026-11-03T09:21:30.623Z] [INFO] POST /orders - Status: 201 - 25ms
✔ creates an order and verifies it exists in the database (36.782149ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 438.180486

Both automated tests passed, and the tests ran against shiphub_test, keeping the main shiphub database separate

# Database Unavailable Test

**Request:** `GET /orders`
curl -i http://localhost:3000/orders

# Result: 

HTTP/1.1 503 Service Unavailable
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 60
ETag: W/"3c-SpDHjBr2kiixsbh/lJAOiOFevCk"
Date: Wed, 04 Nov 2026 03:59:47 GMT
Connection: keep-alive
Keep-Alive: timeout=5


# Reflection


I used a raw MongoDB collection update for the migration because it updates existing documents directly without relying on Mongoose schema defaults.

## Fragile Aspects
The migration must be idempotent so repeated runs do not modify already migrated documents.
The compound index improves reads but adds storage and write overhead.
Database connection failures must be handled properly by the API.