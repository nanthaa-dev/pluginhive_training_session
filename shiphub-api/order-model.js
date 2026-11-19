import mongoose from 'mongoose';
import { ORDER_FLOW } from './fulfilment/flows.js';

const orderSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true
    },
    customer: {
      type: String,
      required: true
    },
    sellerId: {
      type: String
    },
    product: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: true,
      enum: Object.keys(ORDER_FLOW),
      default: 'Pending'
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal'
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.idempotencyKey;
        return ret;
      }
    }
  }
);
orderSchema.index({
  priority: 1,
  createdAt: -1,
  id: 1
});
const Order = mongoose.model('Order', orderSchema);

export default Order;