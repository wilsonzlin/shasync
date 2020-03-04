import AWS from 'aws-sdk';
import {cryptoRandomHex} from 'crng';
import {ICDNService} from './ICDNService';
import moment = require('moment');

export interface ICloudFrontSettings {
  accessKeyID: string;
  secretAccessKey: string;
  distributionID: string;
}

const assertValidKey = (key: any): void => {
  if (typeof key != 'string' || key[0] != '/') {
    throw new SyntaxError(`CloudFront keys must be a string and start with a forward slash (got "${key}")`);
  }
};

export class CloudFront implements ICDNService {
  private readonly cf: AWS.CloudFront;
  private readonly distributionID: string;

  constructor (settings: ICloudFrontSettings) {
    this.distributionID = settings.distributionID;
    this.cf = new AWS.CloudFront({
      accessKeyId: settings.accessKeyID,
      secretAccessKey: settings.secretAccessKey,
    });
  }

  async invalidate (...keys: string[]): Promise<void> {
    keys.forEach(key => assertValidKey(key));

    const timestamp = moment().format();
    const randomSuffix = cryptoRandomHex(3);

    await this.cf.createInvalidation({
      DistributionId: this.distributionID,
      InvalidationBatch: {
        CallerReference: `shasync_cf_${this.distributionID}_invalidation_${timestamp}_${randomSuffix}`,
        Paths: {
          Quantity: keys.length,
          Items: keys,
        },
      },
    }).promise();
  }
}
