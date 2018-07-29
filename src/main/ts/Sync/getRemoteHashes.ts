import {FilesList, HASH_TYPE, REMOTE_FILE_METADATA_KEY_HASH} from "./__shared__";
import StorageService from "../StorageService/StorageService";
import * as Path from "path";
import hashStream from "../Utils/hashStream";

export interface IGetRemoteHashesArgs {
  prefix: string;
  storageService: StorageService;
}

export default async (
  {
    prefix,
    storageService,
  }: IGetRemoteHashesArgs
): Promise<Map<string, string>> => {
  // Paths of all the files remotely
  // Get all object keys, including ones that end with a slash (they should not be there)
  let remoteFiles: FilesList = (await storageService.list({prefix})).map(o => o.key); // [ music/index.html, music/lib/ooml.js, ... ]

  let remoteFileHashes: Map<string, string> = new Map();

  let remoteFilesWithoutHashes = (
    await Promise.all(
      remoteFiles.map(k => storageService.getMetadata(k))
    )
  ).filter(
    ({key, metadata}) => {
      let remoteHash = metadata[REMOTE_FILE_METADATA_KEY_HASH];

      if (remoteHash) {
        // If cloud file already has hash, get hash
        remoteFileHashes.set(Path.relative(prefix, key), remoteHash);
      }

      return !remoteHash;
    });

  let hashesForRemoteFiles = (
    await Promise.all(
      remoteFilesWithoutHashes.map(o => {
        console.log(`Remote file "${o.key}" does not have a hash, hashing...`);

        return hashStream(HASH_TYPE, storageService.stream(o.key));
      })
    )
  ).map((hash, i) => {
    let key = remoteFilesWithoutHashes[i].key;

    return {
      key: key,
      hash: hash,
    };
  });

  (
    await Promise.all(
      hashesForRemoteFiles.map(({key, hash}) => {
        return storageService.setMetadata({
          key: key,
          metadata: {
            [REMOTE_FILE_METADATA_KEY_HASH]: hash,
          },
        });
      })
    )
  ).forEach((_, i) => {
    let {key, hash} = hashesForRemoteFiles[i];
    console.log(`Hashed remote file "${key}": ${hash}`);
    remoteFileHashes.set(Path.relative(prefix, key), hash);
  });

  return remoteFileHashes;
}
