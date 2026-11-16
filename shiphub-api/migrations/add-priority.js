import mongoose from 'mongoose';

async function migratePriority() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const result = await mongoose.connection
      .collection('orders')
      .updateMany(
        { priority: { $exists: false } },
        { $set: { priority: 'normal' } }
      );

    console.log('Priority migration completed');
    console.log('Documents matched:', result.matchedCount);
    console.log('Documents modified:', result.modifiedCount);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

migratePriority();