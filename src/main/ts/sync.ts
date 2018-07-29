import StorageService from "./StorageService/StorageService";
import CDNService from "./CDNService/CDNService";
import * as Path from "path";
import {FilesList, normaliseFilePath, REMOTE_FILE_METADATA_KEY_HASH} from "./Sync/__shared__";
import getLocalHashes from "./Sync/getLocalHashes";
import getRemoteHashes from "./Sync/getRemoteHashes";
import ask from "./Utils/ask";
import {contentType as ContentType} from "mime-types";
import * as fs from "fs";

export interface ISyncSettings {
  directory: string;
  prefix?: string;
  storageService: StorageService;
  CDNService: CDNService;

  directoryIndex?: string;
}

function assertValidPrefix (prefix: string): void {
  // Prefixes must not start or end with a slash, and cannot contain backward slashes, but can contain forward slashes, and can be an empty string
  if (!/^(?:[^\/\\]+\/)*[^\/\\]*$/.test(prefix)) {
    throw new TypeError(`Invalid prefix "${prefix}"`);
  }
}

export default async (
  {
    directory,
    prefix = "",
    storageService,
    CDNService,

    directoryIndex,
  }: ISyncSettings
) => {
  assertValidPrefix(prefix);

  let localHashes = await getLocalHashes({directory});
  let remoteHashes = await getRemoteHashes({prefix, storageService});

  // Path.relative will convert / to \ on Windows systems, even if base or path has /
  let remoteFiles = new Set([...remoteHashes.keys()].map(k => normaliseFilePath(Path.relative(prefix, k))));
  // Paths of all the files stored locally (folders not included)
  let localFiles = new Set(localHashes.keys()); // [ index.html, lib/ooml.js, ... ]

  let extraRemoteFiles: FilesList = [];
  let missingRemoteFiles: FilesList = [];
  let differentRemoteFiles: FilesList = [];
  let pathsToInvalidate: string[] = [];

  const invalidateFile = (key: string) => {
    let path = `/${prefix}/${key}`;
    pathsToInvalidate.push(path);
    if (directoryIndex && path.endsWith(`/${directoryIndex}`)) {
      let dirname = Path.dirname(path);
      pathsToInvalidate.push(dirname);
      pathsToInvalidate.push(`${dirname}/`);
    }
  };

  remoteFiles.forEach(rf => {
    if (!localFiles.has(rf)) {
      extraRemoteFiles.push(rf);
      invalidateFile(rf);
    }
  });

  localFiles.forEach(lf => {
    if (!remoteFiles.has(lf)) {
      missingRemoteFiles.push(lf);
      invalidateFile(lf);
    } else {
      if (localHashes.get(lf) !== remoteHashes.get(lf)) {
        differentRemoteFiles.push(lf);
        invalidateFile(lf);
      }
    }
  });

  if (!extraRemoteFiles.length) {
    console.log("\nNo extra files");
  } else {
    console.log(`\nExtra files found remotely to delete (${extraRemoteFiles.length}):\n`);
    console.log(extraRemoteFiles.join("\n"));
  }

  if (!missingRemoteFiles.length) {
    console.log("\nNo missing files");
  } else {
    console.log(`\nMissing files not found remotely to upload (${missingRemoteFiles.length}):\n`);
    console.log(missingRemoteFiles.join("\n"));
  }

  if (!differentRemoteFiles.length) {
    console.log("\nNo different files");
  } else {
    console.log(`\nFiles different remotely to upload (${differentRemoteFiles.length}):\n`);
    console.log(differentRemoteFiles.join("\n"));
  }

  if (!extraRemoteFiles.length && !missingRemoteFiles.length && !differentRemoteFiles.length) {
    console.log("\nNothing to do, sync complete");
    // WARNING: Script exits here
    return;
  }

  let confirm = await ask("\nAre you sure you want to sync? (y) ");

  if (confirm.toLowerCase() !== "y") {
    throw new Error(`Sync cancelled by user`);
  }

  if (extraRemoteFiles.length) {
    console.log("\n=============== DELETING FILES ===============\n");
    await storageService.delete(...extraRemoteFiles.map(f => `${prefix}/${f}`));
  }

  if (missingRemoteFiles.length) {
    console.log("\n=============== UPLOADING FILES ===============\n");
    await Promise.all(missingRemoteFiles.concat(differentRemoteFiles).map(f => {
      return storageService.upload({
        key: `${prefix}/${f}`,
        data: fs.createReadStream(Path.join(directory, f)),
        contentType: ContentType(Path.extname(f)) || "application/octet-stream",
        metadata: {
          [REMOTE_FILE_METADATA_KEY_HASH]: localHashes.get(f)!,
        },
      });
    }));
  }

  if (pathsToInvalidate.length) {
    console.log("\n============== INVALIDATING FILES =============\n");
    await CDNService.invalidate(...pathsToInvalidate);
  }
};
