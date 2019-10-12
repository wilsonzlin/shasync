import {FilesList, HASH_TYPE, REMOTE_FILE_METADATA_KEY_HASH} from "./common";
import * as Path from "path";
import {hashStream} from "../Utils/hashStream";
import {IStorageService} from "../StorageService/IStorageService";

export interface IGetRemoteHashesArgs {
  prefix: string;
  storageService: IStorageService;
}

export const getRemoteHashes = async (
  {
    prefix,
    storageService,
  }: IGetRemoteHashesArgs
): Promise<Map<string, string>> => {
  // Paths of all the files remotely
  // Get all object keys, including ones that end with a slash (they should not be there)
  const remoteFiles: FilesList = await storageService.list({prefix})
    .then(list => list.map(o => o.key)); // [ music/index.html, music/lib/ooml.js, ... ]

  const remoteFileHashes: Map<string, string> = new Map();

  const remoteFilesWithoutHashes = await Promise.all(remoteFiles.map(k => storageService.getMetadata(k)))
    .then(data => data.filter(
      ({key, metadata}) => {
        const remoteHash = metadata[REMOTE_FILE_METADATA_KEY_HASH];

        if (remoteHash) {
          // If cloud file already has hash, get hash
          remoteFileHashes.set(Path.relative(prefix, key), remoteHash);
        }

        return !remoteHash;
      }));

  const hashesForRemoteFiles = await Promise.all(remoteFilesWithoutHashes.map(o => {
    console.log(`Remote file "${o.key}" does not have a hash, hashing...`);

    return hashStream(HASH_TYPE, storageService.stream(o.key));
  })).then(data => data.map((hash, i) => {
    const key = remoteFilesWithoutHashes[i].key;

    return {
      key: key,
      hash: hash,
    };
  }));

  await Promise.all(hashesForRemoteFiles.map(({key, hash}) => storageService.setMetadata({
    key: key,
    metadata: {
      [REMOTE_FILE_METADATA_KEY_HASH]: hash,
    },
  })))
    .then(data => data.forEach((_, i) => {
      const {key, hash} = hashesForRemoteFiles[i];
      console.log(`Hashed remote file "${key}": ${hash}`);
      remoteFileHashes.set(Path.relative(prefix, key), hash);
    }));

  return remoteFileHashes;
};
