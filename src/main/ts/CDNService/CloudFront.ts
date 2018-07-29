import CDNService from "./CDNService";
import {cryptoRandomHex} from "cr-hex/dist/cryptoRandomHex";
import AWS from "aws-sdk";
import moment = require("moment");

export interface ICloudFrontSettings {
  accessKeyID: string;
  secretAccessKey: string;
  distributionID: string;
}

function assertValidKey (key: any): void {
  if (typeof key != "string" || key[0] != "/") {
    throw new SyntaxError(`CloudFront keys must be a string and start with a forward slash (got "${key}")`);
  }
}

export default class extends CDNService {
  private readonly cf: AWS.CloudFront;
  private readonly accessKeyID: string;
  private readonly secretAccessKey: string;
  private readonly distributionID: string;

  constructor (settings: ICloudFrontSettings) {
    super();
    this.accessKeyID = settings.accessKeyID;
    this.secretAccessKey = settings.secretAccessKey;
    this.distributionID = settings.distributionID;
    this.cf = new AWS.CloudFront({
      accessKeyId: settings.accessKeyID,
      secretAccessKey: settings.secretAccessKey,
    });
  }

  invalidate (...keys: string[]): Promise<void> {
    keys.forEach(key => assertValidKey(key));

    return new Promise((resolve, reject) => {
      let timestamp = moment().format();
      let randomSuffix = cryptoRandomHex(3);

      this.cf.createInvalidation({
        DistributionId: this.distributionID,
        InvalidationBatch: {
          CallerReference: `shasync_cf_${this.distributionID}_invalidation_${timestamp}_${randomSuffix}`,
          Paths: {
            Quantity: keys.length,
            Items: keys,
          },
        },
      }, err => {
        if (err) {
          reject(err);
          return;
        }

        keys.forEach(key => {
          console.log(`Invalidated ${key}`);
        });

        resolve();
      });
    });
  }
}
