# Day 13 — API evidence

The following examples use the default Compose API host port, `3002`. Start
with an existing order and a shipment that has reached `out_for_delivery`.
Use `POST /shipments/:id/failed-attempts` three times; each request records one
failed attempt and the server owns the counter.

## Successful transition

**Request**

```http
POST /shipments/SHP-123/move HTTP/1.1
Host: localhost:3002
Content-Type: application/json

{"next":"returned"}
```

**Response**

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "success": true,
  "next": "returned",
  "shipment": {
    "id": "SHP-123",
    "orderId": "ORD-123",
    "status": "returned",
    "failedDeliveryAttempts": 3
  },
  "orderStatus": "Returned"
}
```

## Refused transition out of `returned`

**Request**

```http
POST /shipments/SHP-123/move HTTP/1.1
Host: localhost:3002
Content-Type: application/json

{"next":"in_transit"}
```

**Response**

```http
HTTP/1.1 409 Conflict
Content-Type: application/json; charset=utf-8

{
  "success": false,
  "error": "Cannot transition from returned to in_transit"
}
```

The HTTP route tests exercise these exact response shapes with an in-memory
model fixture, so they run independently of MongoDB.
