import * as sacli from 'sacli';
import {CLI} from './CLI';

export * from './CDNService/ICDNService';
export * from './CDNService/Cloudflare';
export * from './CDNService/CloudFront';
export * from './StorageService/IStorageService';
export * from './StorageService/S3';
export * from './Sync/sync';

if (require.main === module) {
  sacli.exec(process.argv.slice(2), CLI);
}
