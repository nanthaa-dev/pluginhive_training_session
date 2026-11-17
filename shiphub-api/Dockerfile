FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json server.js config.js db.js \
    errorHandler.js HttpError.js logger.js notFound.js order-model.js \
    order-store.js resolvers.js schema.graphql ./
COPY --chown=node:node migrations ./migrations

USER node

EXPOSE 3000

CMD ["node", "server.js"]
