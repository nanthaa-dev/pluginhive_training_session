import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  InvalidTransitionError,
  ORDER_FLOW,
  ORDER_STATUS_FOR,
  SHIPMENT_FLOW,
  move
} from '../fulfilment/flows.js';

test('allows return only from out_for_delivery after three failed attempts', () => {
  assert.equal(
    move('out_for_delivery', 'returned', SHIPMENT_FLOW, { failedDeliveryAttempts: 3 }),
    'returned'
  );
});

test('rejects picked_up directly transitioning to returned', () => {
  assert.throws(
    () => move('picked_up', 'returned', SHIPMENT_FLOW, { failedDeliveryAttempts: 3 }),
    InvalidTransitionError
  );
});

test('returned is terminal and has no outgoing transitions', () => {
  assert.deepEqual(SHIPMENT_FLOW.returned, []);
  assert.throws(
    () => move('returned', 'in_transit', SHIPMENT_FLOW, { failedDeliveryAttempts: 3 }),
    InvalidTransitionError
  );
});

test('every shipment state is reachable from label_created', () => {
  const reached = new Set(['label_created']);
  const pending = ['label_created'];

  while (pending.length > 0) {
    const current = pending.pop();
    for (const next of SHIPMENT_FLOW[current]) {
      if (!reached.has(next)) {
        reached.add(next);
        pending.push(next);
      }
    }
  }

  assert.deepEqual([...reached].sort(), Object.keys(SHIPMENT_FLOW).sort());
});

test('every shipment transition maps to a valid order transition', () => {
  assert.deepEqual(Object.keys(ORDER_STATUS_FOR).sort(), Object.keys(SHIPMENT_FLOW).sort());

  for (const [current, nextStates] of Object.entries(SHIPMENT_FLOW)) {
    for (const next of nextStates) {
      assert.equal(
        move(ORDER_STATUS_FOR[current], ORDER_STATUS_FOR[next], ORDER_FLOW),
        ORDER_STATUS_FOR[next],
        `${current} -> ${next} must keep order flow consistent`
      );
    }
  }

  assert.equal(ORDER_STATUS_FOR.returned, 'Returned');
  assert.deepEqual(ORDER_FLOW.Returned, []);
});

test('rejects a return before the third failed attempt', () => {
  assert.throws(
    () => move('out_for_delivery', 'returned', SHIPMENT_FLOW, { failedDeliveryAttempts: 2 }),
    /three failed delivery attempts/
  );
});
