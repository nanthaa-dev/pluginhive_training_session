import type { CreateOrderInput, Order } from "./types";
import {
  DELIVERY_NOTE_MAX_LENGTH,
  normalizeDeliveryNote,
} from "./lib/deliveryNote";

export type OrderFieldErrors = Partial<
  Record<keyof CreateOrderInput, string>
>;

export class FakeApiError extends Error {
  public readonly status: number;
  public readonly fields: OrderFieldErrors;

  constructor(
    status: number,
    fields: OrderFieldErrors = {},
    message = "The order could not be saved.",
  ) {
    super(message);
    this.name = "FakeApiError";
    this.status = status;
    this.fields = fields;
  }
}

const ordersByIdempotencyKey = new Map<string, Order>();
const failedDemoKeys = new Set<string>();
let nextOrderNumber = 1;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export async function createOrder(
  input: CreateOrderInput,
  idempotencyKey: string,
): Promise<Order> {
  await delay(900);

  const existingOrder = ordersByIdempotencyKey.get(idempotencyKey);
  if (existingOrder) {
    return existingOrder;
  }

  const demoMode = new URLSearchParams(window.location.search).get("demo");
  if (
    import.meta.env.DEV &&
    demoMode === "retry" &&
    !failedDemoKeys.has(idempotencyKey)
  ) {
    failedDemoKeys.add(idempotencyKey);
    throw new Error("Simulated temporary network failure.");
  }

  const note = normalizeDeliveryNote(input.note ?? "");
  if (note && note.length > DELIVERY_NOTE_MAX_LENGTH) {
    throw new FakeApiError(400, {
      note: `Delivery note must be ${DELIVERY_NOTE_MAX_LENGTH} characters or fewer.`,
    });
  }

  const order: Order = {
    id: `FAKE-${nextOrderNumber++}`,
    customer: input.customer,
    product: input.product,
    status: "Pending",
    ...(note ? { note } : {}),
  };
  ordersByIdempotencyKey.set(idempotencyKey, order);
  return order;
}
