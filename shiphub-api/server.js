import express from 'express';
import cors from 'cors';
import { getAllOrders, getOrderById, createOrder, updateOrder, getOrdersByStatus } from './order-store.js';
import { PORT } from './config.js';
import { logger } from './logger.js';
import { notFound } from './notFound.js';
import { errorHandler } from './errorHandler.js';
import { HttpError } from './HttpError.js';
import { connectDB } from './db.js';
import Order from './order-model.js';
import { createHandler } from 'graphql-http/lib/use/express';
import { schema } from './resolvers.js';
import { fileURLToPath } from 'node:url';
export const app = express();
app.use((req, res, next) => {
  const startTime = Date.now();

  logger.debug(`${req.method} ${req.path} - Request received`);

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    const message = `${req.method} ${req.path} - Status: ${res.statusCode} - ${duration}ms`;

    if (res.statusCode >= 500) {
      logger.error(message);
    } else if (res.statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.info(message);
    }
  });
  next();
});
app.use(cors());
app.use(express.json());
app.get('/orders', async (req, res) => {
  const { status, priority } = req.query;

  if (status !== undefined) {
    const allowedStatuses = [
      'Pending',
      'Processing',
      'Shipped',
      'Delivered',
      'Cancelled'
    ];

    if (!allowedStatuses.includes(status)) {
      throw new HttpError(400, 'Invalid order status');
    }

    const orders = await getOrdersByStatus(status);

    return res.json({
      success: true,
      data: orders
    });
  }
  if (priority !== undefined) {
    const allowedPriorities = ['low', 'normal', 'high'];

    if (!allowedPriorities.includes(priority)) {
      throw new HttpError(
        400,
        'Invalid priority. Allowed values are low, normal, high'
      );
    }

    const orders = await Order.find({ priority }).select('-_id');

    return res.json({
      success: true,
      data: orders
    });
  }
  const orders = await getAllOrders();

  return res.json({
    success: true,
    data: orders
  });
});

app.get('/orders/:id', async (req, res) => {
  const order = await getOrderById(req.params.id);

  if (!order) {
    throw new HttpError(
      404,
      `No order exists with ID ${req.params.id}`
    );
  }

  return res.json(order);
});

app.post('/orders', async (req, res) => {
  const { customer, product } = req.body ?? {};
  if (
    typeof customer !== 'string' ||
    !customer.trim() ||
    typeof product !== 'string' ||
    !product.trim()
  ) {
    throw new HttpError(400, 'Customer and product are both required.');
  }
  const rawKey = req.get('Idempotency-Key');
  const idempotencyKey = rawKey?.trim();
  if (rawKey !== undefined && !idempotencyKey) {
    throw new HttpError(400, 'Idempotency-Key must not be empty');
  }
  const result = await createOrder(
    customer.trim(),
    product.trim(),
    idempotencyKey
  );
  return res.status(result.replayed ? 200 : 201).json(result.order);
});

app.patch('/orders/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const existingOrder = await getOrderById(id);

  if (!existingOrder) {
    throw new HttpError(404, 'Order not found');
  }

  if (
    !updates ||
    typeof updates !== 'object' ||
    Array.isArray(updates) ||
    Object.keys(updates).length === 0
  ) {
    throw new HttpError(400, 'Updated data is required');
  }

  const allowedFields = ['customer', 'product', 'status'];

  if (Object.keys(updates).some(field => !allowedFields.includes(field))) {
    throw new HttpError(400, 'Unknown fields are not allowed');
  }

  for (const field of ['customer', 'product']) {
    if (
      field in updates &&
      (typeof updates[field] !== 'string' || !updates[field].trim())
    ) {
      throw new HttpError(400, `${field} must not be blank`);
    }
  }

  const allowedStatuses = [
    'Pending',
    'Processing',
    'Shipped',
    'Delivered',
    'Cancelled'
  ];

  if (
    'status' in updates &&
    !allowedStatuses.includes(updates.status)
  ) {
    throw new HttpError(400, 'Invalid order status');
  }

  const updatedOrder = { ...updates };

  if (updatedOrder.customer !== undefined) {
    updatedOrder.customer = updatedOrder.customer.trim();
  }

  if (updatedOrder.product !== undefined) {
    updatedOrder.product = updatedOrder.product.trim();
  }

  const result = await updateOrder(id, updatedOrder);

  return res.json({
    success: true,
    data: result
  });
});
app.all('/graphql', createHandler({ schema }));
app.use(notFound);
app.use(errorHandler);
async function startServer() {
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.info(`ShipHub API running at http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    logger.error(`Server listen error: ${err.message}`);
    process.exit(1);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}