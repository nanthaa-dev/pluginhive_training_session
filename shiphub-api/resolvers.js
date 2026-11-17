import { GraphQLError } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { listOrders } from './order-store.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const sellers = [
  { id: '1', name: 'Northstar Goods', city: 'Bengaluru' },
  { id: '2', name: 'Cedar & Clay Studio', city: 'Mumbai' },
  { id: '3', name: 'Beacon Outfitters', city: 'New Delhi' }
];

const typeDefs = await readFile(
  fileURLToPath(new URL('./schema.graphql', import.meta.url)),
  'utf8'
);

export function checkLimit(limit) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new GraphQLError('limit must be an integer between 1 and 100', {
      extensions: { code: 'BAD_USER_INPUT' }
    });
  }

  return limit;
}

export const resolvers = {
  Query: {
    sellers: () => sellers,
    seller: (_source, { id }) => sellers.find(seller => seller.id === id) ?? null
  },
  Seller: {
    shippedOrders: (seller, { limit }) => listOrders({
      sellerId: seller.id,
      status: 'Shipped',
      limit: checkLimit(limit)
    })
  }
};

export const schema = makeExecutableSchema({ typeDefs, resolvers });
