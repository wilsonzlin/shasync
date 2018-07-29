export default abstract class {
  public abstract invalidate (...keys: string[]): Promise<void>;
}
