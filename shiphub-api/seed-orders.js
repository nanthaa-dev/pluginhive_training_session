import mongoose from 'mongoose';
import Order from './order-model.js';

async function seedOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const orders = [];

    const priorities = ['low', 'normal', 'high'];
    const statuses = [
      'Pending',
      'Processing',
      'Shipped',
      'Delivered',
      'Cancelled'
    ];

    for (let i = 1; i <= 50000; i++) {
      orders.push({
        id: `SEED-${i}`,
        customer: `Customer ${i}`,
        product: `Product ${i}`,
        status: statuses[i % statuses.length],
        priority: priorities[i % priorities.length],
        createdAt: new Date(Date.now() - i * 1000),
        updatedAt: new Date()
      });
    }

    const result = await Order.insertMany(orders);

    console.log('Orders inserted:', result.length);
  } catch (error) {
    console.error('Seeding failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

seedOrders();