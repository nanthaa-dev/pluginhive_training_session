import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createFulfilmentRouter } from '../fulfilment/routes.js';

let server;
let baseUrl;
let shipment;
let order;

before(async () => {
  order = { id: 'ORD-RETURN-1', status: 'Shipped' };
  shipment = {
    id: 'SHP-RETURN-1',
    orderId: order.id,
    status: 'out_for_delivery',
    failedDeliveryAttempts: 3
  };

  const OrderModel = {
    findOne: async ({ id }) => id === order.id ? { ...order } : null,
    findOneAndUpdate: async (filter, update) => {
      if (filter.id !== order.id || filter.status !== order.status) {
        return null;
      }
      Object.assign(order, update.$set);
      return { ...order };
    }
  };
  const ShipmentModel = {
    findOne: async ({ id }) => id === shipment.id ? { ...shipment } : null,
    findOneAndUpdate: async (filter, update) => {
      if (
        filter.id !== shipment.id ||
        filter.status !== shipment.status ||
        (
          typeof filter.failedDeliveryAttempts === 'number' &&
          filter.failedDeliveryAttempts !== shipment.failedDeliveryAttempts
        ) ||
        (
          filter.failedDeliveryAttempts?.$lt !== undefined &&
          shipment.failedDeliveryAttempts >= filter.failedDeliveryAttempts.$lt
        )
      ) {
        return null;
      }
      Object.assign(shipment, update.$set);
      if (update.$inc) {
        for (const [field, amount] of Object.entries(update.$inc)) {
          shipment[field] += amount;
        }
      }
      return { ...shipment };
    }
  };

  const app = express();
  app.use(express.json());
  app.use('/shipments', createFulfilmentRouter({ OrderModel, ShipmentModel }));
  app.use((error, _req, res, _next) => {
    return res.status(error.statusCode ?? 500).json({
      success: false,
      error: error.message
    });
  });
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
});

test('returns a shipment after three failed attempts and updates the order', async () => {
  const response = await fetch(`${baseUrl}/shipments/${shipment.id}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ next: 'returned' })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    next: 'returned',
    shipment: {
      id: 'SHP-RETURN-1',
      orderId: 'ORD-RETURN-1',
      status: 'returned',
      failedDeliveryAttempts: 3
    },
    orderStatus: 'Returned'
  });
});

test('refuses a transition out of returned with HTTP 409', async () => {
  const response = await fetch(`${baseUrl}/shipments/${shipment.id}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ next: 'in_transit' })
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    success: false,
    error: 'Cannot transition from returned to in_transit'
  });
});

test('refuses API return before the third failed attempt', async () => {
  shipment.status = 'out_for_delivery';
  shipment.failedDeliveryAttempts = 2;
  const response = await fetch(`${baseUrl}/shipments/${shipment.id}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ next: 'returned' })
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    success: false,
    error: 'Shipment can only be returned after three failed delivery attempts'
  });
  assert.equal(shipment.status, 'out_for_delivery');
});

test('records failed attempts server-side only while out_for_delivery', async () => {
  shipment.status = 'out_for_delivery';
  shipment.failedDeliveryAttempts = 0;
  const response = await fetch(`${baseUrl}/shipments/${shipment.id}/failed-attempts`, {
    method: 'POST'
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    failedDeliveryAttempts: 1
  });
  assert.equal(shipment.failedDeliveryAttempts, 1);
});
