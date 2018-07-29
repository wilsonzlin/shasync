import StorageService, {
  IListArgs,
  IObject,
  IStorageServiceCopyArgs,
  IStorageServiceGetMetadataResult,
  IStorageServiceSetMetadataArgs,
  IUploadArgs
} from "./StorageService";
import AWS from "aws-sdk";
import ReadableStream = NodeJS.ReadableStream;

export interface IS3Settings {
  accessKeyID: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
}

function assertValidKey (key: any): void {
  if (typeof key != "string" || key[0] == "/") {
    throw new SyntaxError(`S3 keys must be a string and cannot start with a forward slash (got "${key}")`);
  }
}

export default class extends StorageService {
  private readonly s3: AWS.S3;
  private readonly accessKeyID: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly bucket: string;

  constructor (settings: IS3Settings) {
    super();
    this.accessKeyID = settings.accessKeyID;
    this.secretAccessKey = settings.secretAccessKey;
    this.region = settings.region;
    this.bucket = settings.bucket;
    this.s3 = new AWS.S3({
      accessKeyId: settings.accessKeyID,
      secretAccessKey: settings.secretAccessKey,
      region: settings.region,
    });
  }

  copy (
    {
      fromKey,
      toKey,
      contentType,
      metadata,
    }: IStorageServiceCopyArgs
  ): Promise<void> {
    assertValidKey(fromKey);
    assertValidKey(toKey);

    return new Promise((resolve, reject) => {
      this.s3.copyObject({
        Bucket: this.bucket,
        CopySource: this.bucket + "/" + fromKey,
        Key: toKey,
        ContentType: contentType,
        Metadata: metadata,
        MetadataDirective: "REPLACE",
      }, err => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`Copied ${fromKey} to ${toKey}`);

        resolve();
      });
    });
  }

  getMetadata (key: string): Promise<IStorageServiceGetMetadataResult> {
    assertValidKey(key);

    return new Promise((resolve, reject) => {
      this.s3.headObject({
        Bucket: this.bucket,
        Key: key,
      }, (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          key: key,
          metadata: data.Metadata || {},
        });
      });
    });
  }

  setMetadata ({key, metadata}: IStorageServiceSetMetadataArgs): Promise<void> {
    assertValidKey(key);

    return new Promise((resolve, reject) => {
      this.s3.headObject({
        Bucket: this.bucket,
        Key: key,
      }, (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        let contentType = data.ContentType;

        this.copy({
          fromKey: key,
          toKey: key,
          contentType: contentType,
          metadata: metadata,
        })
          .then(() => void resolve())
          .catch(reject);
      });
    });
  }

  list ({prefix, maximumKeys = 100000}: IListArgs): Promise<IObject[]> {
    assertValidKey(prefix);

    return new Promise((resolve, reject) => {
      this.s3.listObjectsV2({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maximumKeys,
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.Contents!.map(o => ({
            key: o.Key!,
            lastModified: o.LastModified!,
            size: o.Size!,
          })));
        }
      });
    });
  }

  delete (...keys: string[]): Promise<void> {
    keys.forEach(key => assertValidKey(key));

    return new Promise((resolve, reject) => {
      this.s3.deleteObjects({
        Bucket: this.bucket,
        Delete: {
          Objects: keys.map(k => ({Key: k})),
        },
      }, (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        data.Deleted!.forEach(obj => {
          console.log(`Deleted ${obj.Key}`);
        });

        data.Errors!.forEach(obj => {
          console.log(`Failed to delete ${obj.Key}: ${obj.Message}`);
        });

        if (data.Errors!.length) {
          reject(Error("Some files failed to delete"));
        } else {
          resolve();
        }
      });
    });
  }

  upload ({key, data, contentType, metadata}: IUploadArgs): Promise<void> {
    assertValidKey(key);

    return new Promise((resolve, reject) => {
      this.s3.upload({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
        Metadata: metadata,
      }, err => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`Uploaded ${key}`);

        resolve();
      });
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
