export const SHIPMENT_FLOW = Object.freeze({
  label_created: Object.freeze(['picked_up']),
  picked_up: Object.freeze(['in_transit']),
  in_transit: Object.freeze(['out_for_delivery']),
  out_for_delivery: Object.freeze(['in_transit', 'delivered', 'returned']),
  delivered: Object.freeze([]),
  returned: Object.freeze([])
});

export const ORDER_FLOW = Object.freeze({
  Pending: Object.freeze(['Processing', 'Shipped', 'Cancelled']),
  Processing: Object.freeze(['Shipped', 'Cancelled']),
  Shipped: Object.freeze(['Delivered', 'Returned']),
  Delivered: Object.freeze([]),
  Cancelled: Object.freeze([]),
  Returned: Object.freeze([])
});

export const ORDER_STATUS_FOR = Object.freeze({
  label_created: 'Processing',
  picked_up: 'Shipped',
  in_transit: 'Shipped',
  out_for_delivery: 'Shipped',
  delivered: 'Delivered',
  returned: 'Returned'
});

export class InvalidTransitionError extends Error {
  constructor(current, next, message = `Cannot transition from ${current} to ${next}`) {
    super(message);
    this.name = 'InvalidTransitionError';
  }
}

export function move(current, next, flow, context = {}) {
  if (!Object.hasOwn(flow, current)) {
    throw new InvalidTransitionError(current, next);
  }
  if (current === next) {
    return current;
  }
  if (!flow[current].includes(next)) {
    throw new InvalidTransitionError(current, next);
  }
  if (
    flow === SHIPMENT_FLOW &&
    next === 'returned' &&
    (!Number.isInteger(context.failedDeliveryAttempts) || context.failedDeliveryAttempts < 3)
  ) {
    throw new InvalidTransitionError(
      current,
      next,
      'Shipment can only be returned after three failed delivery attempts'
    );
  }
  return next;
}
