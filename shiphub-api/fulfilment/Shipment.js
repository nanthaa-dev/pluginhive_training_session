import mongoose from 'mongoose';
import { SHIPMENT_FLOW } from './flows.js';

const shipmentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true
    },
    orderId: {
      type: String,
      required: true,
      unique: true
    },
    status: {
      type: String,
      enum: Object.keys(SHIPMENT_FLOW),
      default: 'label_created',
      required: true
    },
    failedDeliveryAttempts: {
      type: Number,
      min: 0,
      max: 3,
      default: 0,
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const Shipment = mongoose.model('Shipment', shipmentSchema);

export default Shipment;
