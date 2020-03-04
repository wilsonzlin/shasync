import * as sacli from 'sacli';
import {Cloudflare} from './CDNService/Cloudflare';
import {CloudFront} from './CDNService/CloudFront';
import {ICDNService} from './CDNService/ICDNService';
import {IStorageService} from './StorageService/IStorageService';
import {S3} from './StorageService/S3';
import {diff} from './Sync/diff';
import {sync} from './Sync/sync';

const getEnv = (name: string): string => {
  const val = process.env[name];
  if (!val) {
    throw new ReferenceError(`Environment variable "${name}" not set`);
  }
  return val;
};

export const CLI = sacli.build({
  name: 'shasync',
  commands: [
    {
      name: '',
      description: 'Syncronise local files with a cloud file storage provider. Can also invalidate changed remote files with a CDN.',
      options: [
        {
          alias: 'd',
          name: 'directory',
          description: 'Path to local folder to synchronise',
          type: String,
          typeLabel: '<dir>',
        },
        {
          alias: 'p',
          name: 'prefix',
          description: 'Prefix of cloud storage object keys',
          type: String,
          typeLabel: '<prefix>',
        },
        {
          alias: 's',
          name: 'storage',
          description: 'Cloud storage service; one of `aws` or `b2`; provide AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION as environment variables if `aws`',
          type: String,
          typeLabel: 'aws|b2',
        },
        {
          alias: 'b',
          name: 'bucket',
          description: 'Cloud storage bucket',
          type: String,
          typeLabel: '<bucket>',
        },
        {
          alias: 'c',
          name: 'cdn',
          description: 'CDN service; one of `aws` or `cf`; provide AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_DISTRIBUTION as environment variables if `aws`; provide CF_ZONE_ID, CF_SITE, CF_EMAIL, CF_API_KEY as environment variables if `cf`',
          type: String,
          typeLabel: 'aws|cf',
        },
        {
          alias: 'i',
          name: 'index',
          description: '[Optional] Directory index file name to invalidate when creating or deleting cloud directories',
          type: String,
          typeLabel: '<index>',
        },
      ],
      action: async ({
        bucket,
        cdn,
        directory,
        index,
        prefix,
        storage,
      }: {
        bucket: string,
        cdn: string,
        directory: string,
        index?: string,
        prefix: string,
        storage: string,
      }) => {
        let storageService: IStorageService;
        switch (storage) {
        case 'aws':
          storageService = new S3({
            accessKeyID: getEnv('AWS_ACCESS_KEY_ID'),
            secretAccessKey: getEnv('SECRET_ACCESS_KEY'),
            bucket,
            region: getEnv('AWS_REGION'),
          });
          break;
        case 'b2':
          // TODO
          throw new Error(`B2 is currently not supported`);
        default:
          throw new TypeError('Unrecognised cloud storage service');
        }

        let cdnService: ICDNService;
        switch (cdn) {
        case 'aws':
          cdnService = new CloudFront({
            accessKeyID: getEnv('AWS_ACCESS_KEY_ID'),
            secretAccessKey: getEnv('SECRET_ACCESS_KEY'),
            distributionID: getEnv('AWS_DISTRIBUTION'),
          });
          break;
        case 'cf':
          cdnService = new Cloudflare({
            email: getEnv('CF_EMAIL'),
            globalAPIKey: getEnv('CF_API_KEY'),
            site: getEnv('CF_SITE'),
            zoneID: getEnv('CF_ZONE_ID'),
          });
          break;
        default:
          throw new TypeError('Unrecognised CDN service');
        }

        const d = await diff({
          directory,
          prefix,
          storageService,
          directoryIndex: index,
        });

        await sync({
          diff: d,
          directory,
          prefix,
          storageService,
          CDNService: cdnService,
        });
      },
    },
  ],
});
