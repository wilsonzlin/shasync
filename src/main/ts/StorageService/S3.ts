import AWS from 'aws-sdk';
import {
  IListArgs,
  IObject,
  IStorageService,
  IStorageServiceCopyArgs,
  IStorageServiceGetMetadataResult,
  IStorageServiceSetMetadataArgs,
  IUploadArgs,
} from './IStorageService';
import ReadableStream = NodeJS.ReadableStream;

export interface IS3Settings {
  accessKeyID: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
}

const assertValidKey = (key: any): void => {
  if (typeof key != 'string' || key[0] == '/') {
    throw new SyntaxError(`S3 keys must be a string and cannot start with a forward slash (got "${key}")`);
  }
};

export class S3 implements IStorageService {
  private readonly s3: AWS.S3;
  private readonly bucket: string;

  constructor (settings: IS3Settings) {
    this.bucket = settings.bucket;
    this.s3 = new AWS.S3({
      accessKeyId: settings.accessKeyID,
      secretAccessKey: settings.secretAccessKey,
      region: settings.region,
    });
  }

  async copy (
    {
      fromKey,
      toKey,
      contentType,
      metadata,
    }: IStorageServiceCopyArgs,
  ): Promise<void> {
    assertValidKey(fromKey);
    assertValidKey(toKey);

    await this.s3.copyObject({
      Bucket: this.bucket,
      CopySource: this.bucket + '/' + fromKey,
      Key: toKey,
      ContentType: contentType,
      Metadata: metadata,
      MetadataDirective: 'REPLACE',
    }).promise();
  }

  async getMetadata (key: string): Promise<IStorageServiceGetMetadataResult> {
    assertValidKey(key);

    const data = await this.s3.headObject({
      Bucket: this.bucket,
      Key: key,
    }).promise();

    return {
      key: key,
      metadata: data.Metadata || {},
    };
  }

  async setMetadata ({key, metadata}: IStorageServiceSetMetadataArgs): Promise<void> {
    assertValidKey(key);

    const data = await this.s3.headObject({
      Bucket: this.bucket,
      Key: key,
    }).promise();

    await this.copy({
      fromKey: key,
      toKey: key,
      contentType: data.ContentType,
      metadata: metadata,
    });
  }

  async list ({prefix, maximumKeys = 100000}: IListArgs): Promise<IObject[]> {
    assertValidKey(prefix);

    const data = await this.s3.listObjectsV2({
      Bucket: this.bucket,
      Prefix: prefix,
      MaxKeys: maximumKeys,
    }).promise();

    return data.Contents!.map(o => ({
      key: o.Key!,
      lastModified: o.LastModified!,
      size: o.Size!,
    }));
  }

  async delete (...keys: string[]): Promise<void> {
    keys.forEach(key => assertValidKey(key));

    const data = await this.s3.deleteObjects({
      Bucket: this.bucket,
      Delete: {
        Objects: keys.map(k => ({Key: k})),
      },
    }).promise();

    data.Deleted!.forEach(obj => {
      console.log(`Deleted ${obj.Key}`);
    });

    data.Errors!.forEach(obj => {
      console.log(`Failed to delete ${obj.Key}: ${obj.Message}`);
    });

    if (data.Errors!.length) {
      throw new Error('Some files failed to delete');
    }
  }

  async upload ({key, data, contentType, metadata}: IUploadArgs): Promise<void> {
    assertValidKey(key);

    await this.s3.upload({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
      Metadata: metadata,
    });
  }

  stream (key: string): ReadableStream {
    assertValidKey(key);

    return this.s3.getObject({
      Bucket: this.bucket,
      Key: key,
    }).createReadStream();
  }
}
