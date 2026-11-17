const endpoint = process.env.GRAPHQL_URL ?? 'http://localhost:3002/graphql';
const fragmentWithDefault = `
  fragment SellerDetails on Seller {
    name
    city
    shippedOrders {
      id
      product
    }
  }
`;
const defaultQuery = `
  query SellersAndShipments {
    northstar: seller(id: "1") { ...SellerDetails }
    cedar: seller(id: "2") { ...SellerDetails }
  }
  ${fragmentWithDefault}
`;
const fragmentWithVariable = `
  fragment SellerDetails on Seller {
    name
    city
    shippedOrders(limit: $limit) {
      id
      product
    }
  }
`;
const variableQuery = `
  query SellersAndShipments($limit: Int = 5) {
    northstar: seller(id: "1") { ...SellerDetails }
    cedar: seller(id: "2") { ...SellerDetails }
  }
  ${fragmentWithVariable}
`;

async function showResponse(label, response) {
  const body = await response.text();
  console.log(`\n${label}\nHTTP ${response.status}`);
  try {
    console.log(JSON.stringify(JSON.parse(body), null, 2));
  } catch {
    console.log(body);
  }
}

const firstResponse = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ query: defaultQuery })
});
await showResponse('Two sellers, default limit', firstResponse);

const variableResponse = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ query: variableQuery, variables: { limit: 2 } })
});
await showResponse('Two sellers, limit variable = 2', variableResponse);

const unknownFieldResponse = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    query: '{ seller(id: "1") { name nonexistentField } }'
  })
});
await showResponse('Invalid request: unknown field', unknownFieldResponse);

const excessiveLimitResponse = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    query: '{ seller(id: "1") { shippedOrders(limit: 500) { id } } }'
  })
});
await showResponse('Invalid request: limit 500', excessiveLimitResponse);

const mutation = encodeURIComponent('mutation { createOrder(customer: "A", product: "B") { id } }');
const getMutationResponse = await fetch(`${endpoint}?query=${mutation}`);
await showResponse('Invalid request: mutation over GET', getMutationResponse);
