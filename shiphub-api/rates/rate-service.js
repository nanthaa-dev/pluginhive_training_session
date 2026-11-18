export function createRateService(adapters) {
  return {
    async getRates(request) {
      const responses = await Promise.all(adapters.map((adapter) => adapter.getRates(request)));
      return responses.flat();
    }
  };
}
