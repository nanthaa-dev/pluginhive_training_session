import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { HttpError } from '../HttpError.js';
import Order from '../order-model.js';
import Shipment from './Shipment.js';
import {
  InvalidTransitionError,
  ORDER_FLOW,
  ORDER_STATUS_FOR,
  SHIPMENT_FLOW,
  move
} from './flows.js';

function transition(current, next, flow, context) {
  try {
    return move(current, next, flow, context);
  } catch (error) {
    if (error instanceof InvalidTransitionError) {
      throw new HttpError(409, error.message);
    }
    throw error;
  }
}

function shipmentResponse(shipment) {
  return {
    id: shipment.id,
    orderId: shipment.orderId,
    status: shipment.status,
    failedDeliveryAttempts: shipment.failedDeliveryAttempts
  };
}

export function createFulfilmentRouter({
  OrderModel = Order,
  ShipmentModel = Shipment
} = {}) {
  const router = Router();

  router.post('/', async (req, res) => {
    const orderId = req.body?.orderId;
    if (typeof orderId !== 'string' || !orderId.trim()) {
      throw new HttpError(400, 'orderId is required');
    }

    const order = await OrderModel.findOne({ id: orderId.trim() });
    if (!order) {
      throw new HttpError(404, 'Order not found');
    }
    if (!['Pending', 'Processing'].includes(order.status)) {
      throw new HttpError(409, `Cannot create a shipment for an order in ${order.status}`);
    }

    const existingShipment = await ShipmentModel.findOne({ orderId: order.id });
    if (existingShipment) {
      throw new HttpError(409, 'A shipment already exists for this order');
    }

    if (order.status === 'Pending') {
      const processingStatus = transition(order.status, 'Processing', ORDER_FLOW);
      const updatedOrder = await OrderModel.findOneAndUpdate(
        { id: order.id, status: order.status },
        { $set: { status: processingStatus } },
        { new: true, runValidators: true }
      );
      if (!updatedOrder) {
        throw new HttpError(409, 'Order status changed while creating the shipment');
      }
    }

    try {
      const shipment = await ShipmentModel.create({
        id: `SHP-${randomUUID()}`,
        orderId: order.id,
        status: 'label_created',
        failedDeliveryAttempts: 0
      });
      return res.status(201).json({
        success: true,
        shipment: shipmentResponse(shipment)
      });
    } catch (error) {
      if (error?.code === 11000) {
        throw new HttpError(409, 'A shipment already exists for this order');
      }
      throw error;
    }
  });

  router.get('/:id', async (req, res) => {
    const shipment = await ShipmentModel.findOne({ id: req.params.id });
    if (!shipment) {
      throw new HttpError(404, 'Shipment not found');
    }
    return res.json({ success: true, shipment: shipmentResponse(shipment) });
  });

  router.post('/:id/failed-attempts', async (req, res) => {
    const shipment = await ShipmentModel.findOneAndUpdate(
      {
        id: req.params.id,
        status: 'out_for_delivery',
        failedDeliveryAttempts: { $lt: 3 }
      },
      { $inc: { failedDeliveryAttempts: 1 } },
      { new: true, runValidators: true }
    );

    if (!shipment) {
      const existingShipment = await ShipmentModel.findOne({ id: req.params.id });
      if (!existingShipment) {
        throw new HttpError(404, 'Shipment not found');
      }
      if (existingShipment.status !== 'out_for_delivery') {
        throw new HttpError(409, 'Failed attempts can only be recorded while out_for_delivery');
      }
      throw new HttpError(409, 'Shipment already has three failed delivery attempts');
    }

    return res.json({
      success: true,
      failedDeliveryAttempts: shipment.failedDeliveryAttempts
    });
  });

  router.post('/:id/move', async (req, res) => {
    const next = req.body?.next;
    if (typeof next !== 'string' || !Object.hasOwn(SHIPMENT_FLOW, next)) {
      throw new HttpError(400, 'next must be a valid shipment state');
    }

    const shipment = await ShipmentModel.findOne({ id: req.params.id });
    if (!shipment) {
      throw new HttpError(404, 'Shipment not found');
    }

    const nextShipmentStatus = transition(
      shipment.status,
      next,
      SHIPMENT_FLOW,
      { failedDeliveryAttempts: shipment.failedDeliveryAttempts }
    );
    const order = await OrderModel.findOne({ id: shipment.orderId });
    if (!order) {
      throw new HttpError(404, 'Shipment order not found');
    }
    const nextOrderStatus = transition(
      order.status,
      ORDER_STATUS_FOR[nextShipmentStatus],
      ORDER_FLOW
    );

    const updatedShipment = await ShipmentModel.findOneAndUpdate(
      {
        id: shipment.id,
        status: shipment.status,
        failedDeliveryAttempts: shipment.failedDeliveryAttempts
      },
      { $set: { status: nextShipmentStatus } },
      { new: true, runValidators: true }
    );
    if (!updatedShipment) {
      throw new HttpError(409, 'Shipment state changed before this transition completed');
    }

    let updatedOrder = order;
    if (nextOrderStatus !== order.status) {
      updatedOrder = await OrderModel.findOneAndUpdate(
        { id: order.id, status: order.status },
        { $set: { status: nextOrderStatus } },
        { new: true, runValidators: true }
      );
      if (!updatedOrder) {
        throw new HttpError(409, 'Order status changed before this transition completed');
      }
    }

    return res.json({
      success: true,
      next: updatedShipment.status,
      shipment: shipmentResponse(updatedShipment),
      orderStatus: updatedOrder.status
    });
  });

  return router;
}
