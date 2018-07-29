import ReadableStream = NodeJS.ReadableStream;

export interface IObjectMetadata {
  [key: string]: string;
}

export interface IStorageServiceCopyArgs {
  fromKey: string;
  toKey: string;
  contentType?: string;
  metadata: IObjectMetadata;
}

export interface IStorageServiceGetMetadataResult {
  key: string;
  metadata: IObjectMetadata;
}

export interface IListArgs {
  prefix: string;
  maximumKeys?: number;
}

export interface IObject {
  key: string;
  lastModified: Date;
  size: number;
}

export interface IUploadArgs {
  key: string;
  data: ReadableStream;
  contentType: string;
  metadata: IObjectMetadata;
}

export default abstract class {
  public abstract copy (args: IStorageServiceCopyArgs): Promise<void>;

  public abstract getMetadata (key: string): Promise<IStorageServiceGetMetadataResult>;

  public abstract list (args: IListArgs): Promise<IObject[]>;

  public abstract delete (...keys: string[]): Promise<void>;

  public abstract upload (args: IUploadArgs): Promise<void>;

  public abstract stream (key: string): ReadableStream;
}
