export interface ICDNService {
  invalidate (...keys: string[]): Promise<void>;
}
