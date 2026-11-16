import mongoose from 'mongoose';
import Order from './order-model.js';

async function testQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const result = await Order.find({ priority: 'high' })
      .sort({ createdAt: -1, id: 1 })
      .limit(20)
      .explain('executionStats');

    console.log('Query plan:');
    console.log(JSON.stringify(result.queryPlanner.winningPlan, null, 2));

    console.log('Execution statistics:');
    console.log({
      totalDocsExamined: result.executionStats.totalDocsExamined,
      totalKeysExamined: result.executionStats.totalKeysExamined,
      nReturned: result.executionStats.nReturned,
      executionTimeMillis: result.executionStats.executionTimeMillis
    });
  } catch (error) {
    console.error('Query test failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testQuery();