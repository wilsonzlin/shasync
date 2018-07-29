export abstract class CDNService {
  public abstract invalidate (...keys: string[]): Promise<void>;
}
