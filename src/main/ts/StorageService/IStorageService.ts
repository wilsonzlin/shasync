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

export interface IStorageServiceSetMetadataArgs {
  key: string;
  metadata: IObjectMetadata;
}

export interface IListArgs {
  prefix?: string;
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

export interface IStorageService {
  copy (args: IStorageServiceCopyArgs): Promise<void>;

  getMetadata (key: string): Promise<IStorageServiceGetMetadataResult>;

  setMetadata (args: IStorageServiceSetMetadataArgs): Promise<void>;

  list (args: IListArgs): Promise<IObject[]>;

  delete (...keys: string[]): Promise<void>;

  upload (args: IUploadArgs): Promise<void>;

  stream (key: string): ReadableStream;
}
