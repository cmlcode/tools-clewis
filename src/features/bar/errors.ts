export class BarClosedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BarClosedError";
  }
}
