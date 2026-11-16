import mongoose from 'mongoose';
import Order from './order-model.js';

async function compareReads() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Mongoose read
    const mongooseOrder = await Order.findOne({
      id: 'ORD-LEGACY-002'
    });

    console.log('Mongoose read:');
    console.log(mongooseOrder.toObject());

    // Raw MongoDB read
    const rawOrder = await Order.collection.findOne({
      id: 'ORD-LEGACY-002'
    });

    console.log('Raw MongoDB read:');
    console.log(rawOrder);

    // Count stored normal priorities
    const count = await Order.collection.countDocuments({
      priority: 'normal'
    });

    console.log('Raw normal priority count:', count);
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

compareReads();