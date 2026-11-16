import mongoose from 'mongoose';

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
    product: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
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