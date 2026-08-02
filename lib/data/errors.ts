export class DataLayerError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DataLayerError";
  }
}

export class DataIntegrityError extends DataLayerError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DataIntegrityError";
  }
}
