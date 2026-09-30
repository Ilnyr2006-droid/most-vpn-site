export class SupportCapacityError extends Error {
  constructor(message = "Support storage capacity reached") {
    super(message);
    this.name = "SupportCapacityError";
  }
}

export class SupportStorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SupportStorageError";
  }
}
