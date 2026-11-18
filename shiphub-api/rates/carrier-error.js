export class CarrierError extends Error {
  constructor(reason, message, options = {}) {
    super(message, options);
    this.name = 'CarrierError';
    this.reason = reason;
  }
}
