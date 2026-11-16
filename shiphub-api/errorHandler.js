
import { logger } from './logger.js';
import { HttpError } from './HttpError.js';

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const databaseErrorNames = [
    'MongoServerSelectionError',
    'MongooseServerSelectionError',
    'MongoNetworkError',
    'MongoNetworkTimeoutError',
    'MongoNotConnectedError',
    'MongoTopologyClosedError'
  ];

  const isDatabaseUnavailable = databaseErrorNames.includes(err.name);

  const statusCode = err instanceof HttpError
    ? err.statusCode
    : isDatabaseUnavailable
      ? 503
      : err.status === 400
        ? 400
        : 500;

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.path} - ${err.stack}`);
  } else {
    logger.warn(`${req.method} ${req.path} - ${err.message}`);
  }

  return res.status(statusCode).json({
    success: false,
    error: statusCode === 503
      ? 'Database temporarily unavailable'
      : statusCode === 500
        ? 'Internal server error'
        : err.message
  });
}
