import * as Path from 'path';
import {IStorageService} from '../main';
import {FilesList, normaliseFilePath} from './common';
import {getLocalHashes} from './getLocalHashes';
import {getRemoteHashes} from './getRemoteHashes';

export interface IDiffSettings {
  directory: string;
  prefix?: string;
  storageService: IStorageService;
  directoryIndex?: string;
}

export interface IDiffResult {
  localHashes: Map<string, string>;
  extraRemote: FilesList;
  missingRemote: FilesList;
  differentRemote: FilesList;
  // Paths that now refer to something different and should be invalidated.
  changedPaths: string[];
}

const assertValidPrefix = (prefix: string): void => {
  // Prefixes must not start or end with a slash, and cannot contain backward slashes, but can contain forward slashes, and can be an empty string.
  if (!/^(?:[^\/\\]+\/)*[^\/\\]*$/.test(prefix)) {
    throw new TypeError(`Invalid prefix "${prefix}"`);
  }
};

// TODO Refactor: this function is hard to test and awkwardly returns localHashes.
export const diff = async ({
  directory,
  prefix = '',
  storageService,
  directoryIndex,
}: IDiffSettings): Promise<IDiffResult> => {
  assertValidPrefix(prefix);

  const localHashes = await getLocalHashes({directory});
  const remoteHashes = await getRemoteHashes({prefix, storageService});

  // Path.relative will convert / to \ on Windows systems, even if base or path has /
  const remoteFiles = new Set([...remoteHashes.keys()].map(k => normaliseFilePath(Path.relative(prefix, k))));

  // Paths of all the files stored locally (folders not included) e.g. [ index.html, a/b.js, ... ]
  const localFiles = new Set(localHashes.keys());

  const extraRemote: FilesList = [];
  const missingRemote: FilesList = [];
  const differentRemote: FilesList = [];
  const changedPaths: string[] = [];

  const invalidateFile = (key: string) => {
    const path = `/${prefix}/${key}`;
    changedPaths.push(path);
    if (directoryIndex && path.endsWith(`/${directoryIndex}`)) {
      const dirname = Path.dirname(path);
      changedPaths.push(dirname);
      changedPaths.push(`${dirname}/`);
    }
  };

  for (const rf of remoteFiles) {
    if (!localFiles.has(rf)) {
      extraRemote.push(rf);
      invalidateFile(rf);
    }
  }

  for (const lf of localFiles) {
    if (!remoteFiles.has(lf)) {
      missingRemote.push(lf);
      invalidateFile(lf);
    } else {
      if (localHashes.get(lf) !== remoteHashes.get(lf)) {
        differentRemote.push(lf);
        invalidateFile(lf);
      }
    }
  }

  return {extraRemote, missingRemote, differentRemote, changedPaths, localHashes};
};
