
export type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export interface Order {
  id: string;
  customer: string;
  product: string;
  status: OrderStatus;
  note?: string;
}

export interface CreateOrderInput {
  customer: string;
  product: string;
  note?: string;
}

export type StatusCounts = Record<OrderStatus, number>;
