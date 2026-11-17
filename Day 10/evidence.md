# Day 10 — GraphQL seller shipments

Run `npm run up`, then `npm run gql`. The latter sends both queries and the
three invalid requests to `http://localhost:3002/graphql`.

## Queries

Default limit, two aliases, and one fragment:

```graphql
query SellersAndShipments {
  northstar: seller(id: "1") { ...SellerDetails }
  cedar: seller(id: "2") { ...SellerDetails }
}
fragment SellerDetails on Seller {
  name
  city
  shippedOrders {
    id
    product
  }
}
```

Same request using a limit variable:

```graphql
query SellersAndShipments($limit: Int = 5) {
  northstar: seller(id: "1") { ...SellerDetails }
  cedar: seller(id: "2") { ...SellerDetails }
}
fragment SellerDetails on Seller {
  name
  city
  shippedOrders(limit: $limit) {
    id
    product
  }
}
```

## Predicted response structure

Each alias returns a seller object with a list of orders; in the variable query
the list contains no more than two orders per seller.

```json
{
  "data": {
    "northstar": {
      "name": "Northstar Goods",
      "city": "Bengaluru",
      "shippedOrders": [{ "id": "…", "product": "…" }]
    },
    "cedar": {
      "name": "Cedar & Clay Studio",
      "city": "Mumbai",
      "shippedOrders": [{ "id": "…", "product": "…" }]
    }
  }
}
```

## Actual terminal responses

Five uniquely identified shipped-order fixtures were inserted temporarily
(three for Northstar, two for Cedar) and removed after testing.

```text
Two sellers, default limit — HTTP 200
{
  "data": {
    "northstar": {
      "name": "Northstar Goods",
      "city": "Bengaluru",
      "shippedOrders": [
        { "id": "DAY10-GQL-NS-3", "product": "Demo product 3" },
        { "id": "DAY10-GQL-NS-2", "product": "Demo product 2" },
        { "id": "DAY10-GQL-NS-1", "product": "Demo product 1" }
      ]
    },
    "cedar": {
      "name": "Cedar & Clay Studio",
      "city": "Mumbai",
      "shippedOrders": [
        { "id": "DAY10-GQL-CC-2", "product": "Demo product 5" },
        { "id": "DAY10-GQL-CC-1", "product": "Demo product 4" }
      ]
    }
  }
}

Two sellers, limit variable = 2 — HTTP 200
{
  "data": {
    "northstar": {
      "name": "Northstar Goods",
      "city": "Bengaluru",
      "shippedOrders": [
        { "id": "DAY10-GQL-NS-3", "product": "Demo product 3" },
        { "id": "DAY10-GQL-NS-2", "product": "Demo product 2" }
      ]
    },
    "cedar": {
      "name": "Cedar & Clay Studio",
      "city": "Mumbai",
      "shippedOrders": [
        { "id": "DAY10-GQL-CC-2", "product": "Demo product 5" },
        { "id": "DAY10-GQL-CC-1", "product": "Demo product 4" }
      ]
    }
  }
}
```

## Invalid requests

| Request | HTTP status | Error message | Resolver reached? | Database reached? |
|---|---:|---|---|---|
| Request `nonexistentField` on `Seller` | 200 | `Cannot query field "nonexistentField" on type "Seller".` | No; schema validation rejects it | No |
| `shippedOrders(limit: 500)` | 200 | `limit must be an integer between 1 and 100` | Yes; field resolver validates the limit | No; validation runs before `listOrders` |
| Send a mutation using GET | 405 | `Cannot perform mutations over GET` | No; HTTP method is rejected | No |

The invalid-request behavior and exact response bodies are printed by
`npm run gql`.
