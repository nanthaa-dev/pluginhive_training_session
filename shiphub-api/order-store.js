import Order from './order-model.js';

export async function getAllOrders() {
  return await Order.find().select('-_id');
}

export async function getOrderById(id) {
  return await Order.findOne({ id }).select('-_id');
}

export async function createOrder(customer, product, idempotencyKey) {
  if (idempotencyKey) {
    const existingOrder = await Order.findOne({ idempotencyKey });

    if (existingOrder) {
      return {
        order: existingOrder.toJSON(),
        replayed: true
      };
    }
  }
  try {
    const order = await Order.create({
      id: `ORD-${Date.now()}`,
      customer,
      product,
      status: 'Pending',
      ...(idempotencyKey ? { idempotencyKey } : {})
    });
    return {
      order: order.toJSON(),
      replayed: false
    };
  } catch (error) {
    if (error.code === 11000 && idempotencyKey) {
      const existingOrder = await Order.findOne({ idempotencyKey });

      if (existingOrder) {
        return {
          order: existingOrder.toJSON(),
          replayed: true
        };
      }
    }

    throw error;
  }
}
export async function updateOrder(id, updates) {
  return await Order.findOneAndUpdate(
    { id },
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-_id');
}

export async function getOrdersByStatus(status) {
  if (!status) {
    return getAllOrders();
  }

  return await Order.find({ status }).select('-_id');
}
export async function getHighPriorityOrders() {
  return await Order.find({ priority: 'high' })
    .sort({ createdAt: -1, id: 1 })
    .limit(20)
    .select('-_id');
}