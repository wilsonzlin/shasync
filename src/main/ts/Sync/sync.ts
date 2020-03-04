import * as fs from 'fs';
import {contentType as ContentType} from 'mime-types';
import * as path from 'path';
import {ICDNService} from '../CDNService/ICDNService';
import {IStorageService} from '../StorageService/IStorageService';
import {ask} from '../Utils/ask';
import {REMOTE_FILE_METADATA_KEY_HASH} from './common';
import {IDiffResult} from './diff';

export interface ISyncSettings {
  directory: string;
  prefix?: string;
  storageService: IStorageService;
  CDNService: ICDNService;
  diff: IDiffResult;
}

export const sync = async ({
  directory,
  prefix = '',
  storageService,
  CDNService,
  diff,
}: ISyncSettings) => {
  const {extraRemote, missingRemote, differentRemote, changedPaths, localHashes} = diff;

  if (!extraRemote.length) {
    console.log('\nNo extra files');
  } else {
    console.log(`\nExtra files found remotely to delete (${extraRemote.length}):\n`);
    console.log(extraRemote.join('\n'));
  }

  if (!missingRemote.length) {
    console.log('\nNo missing files');
  } else {
    console.log(`\nMissing files not found remotely to upload (${missingRemote.length}):\n`);
    console.log(missingRemote.join('\n'));
  }

  if (!differentRemote.length) {
    console.log('\nNo different files');
  } else {
    console.log(`\nFiles different remotely to upload (${differentRemote.length}):\n`);
    console.log(differentRemote.join('\n'));
  }

  if (!extraRemote.length && !missingRemote.length && !differentRemote.length) {
    console.log('\nNothing to do, sync complete');
    // WARNING: Function exists here.
    return;
  }

  const confirm = await ask('\nAre you sure you want to sync? (y) ');

  if (confirm.toLowerCase() !== 'y') {
    throw new Error(`Sync cancelled by user`);
  }

  if (extraRemote.length) {
    console.log('\n=============== DELETING FILES ===============\n');
    await storageService.delete(...extraRemote.map(f => `${prefix}/${f}`));
  }

  if (missingRemote.length) {
    console.log('\n=============== UPLOADING FILES ===============\n');
    await Promise.all(missingRemote.concat(differentRemote).map(f => {
      return storageService.upload({
        key: `${prefix}/${f}`,
        data: fs.createReadStream(path.join(directory, f)),
        contentType: ContentType(path.extname(f)) || 'application/octet-stream',
        metadata: {
          [REMOTE_FILE_METADATA_KEY_HASH]: localHashes.get(f)!,
        },
      });
    }));
  }

  if (changedPaths.length) {
    console.log('\n============== INVALIDATING FILES =============\n');
    await CDNService.invalidate(...changedPaths);
  }
};
