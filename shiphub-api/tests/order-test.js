import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { app } from '../server.js';
import Order from '../order-model.js';

let server;
let baseURL;

before(async () => {
  if (!process.env.MONGODB_URI?.includes('/shiphub_test')) {
    throw new Error('Tests must run against shiphub_test');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  assert.equal(mongoose.connection.name, 'shiphub_test');

  server = app.listen(0);

  await new Promise(resolve => server.once('listening', resolve));

  baseURL = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await Order.deleteMany({
    idempotencyKey: 'automated-test-key'
  });

  if (server) {
    await new Promise(resolve => server.close(resolve));
  }

  await mongoose.disconnect();
});

test('rejects an invalid priority', async () => {
  const response = await fetch(`${baseURL}/orders?priority=urgent`);

  assert.equal(response.status, 400);

  const body = await response.json();

  assert.match(body.error, /Invalid priority/);
});

test('creates an order and verifies it exists in the database', async () => {
  const response = await fetch(`${baseURL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': 'automated-test-key'
    },
    body: JSON.stringify({
      customer: 'Test Customer',
      product: 'Test Product'
    })
  });

  assert.equal(response.status, 201);

  const createdOrder = await response.json();

  const savedOrder = await Order.collection.findOne({
    id: createdOrder.id
  });

  assert.ok(savedOrder);
  assert.equal(savedOrder.customer, 'Test Customer');
  assert.equal(savedOrder.product, 'Test Product');
});