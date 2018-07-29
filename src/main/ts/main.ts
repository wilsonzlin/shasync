import minimist = require("minimist");

const fs = require("fs");
import {contentType as ContentType} from "mime-types";
import * as Path from "path";
import * as jogger from "fs-jogger";

const ARGS = minimist(process.argv.slice(2));

// Hash used to uniquely identify every file
const APP_FILES_INTEGRITY_HASH = "sha512";
const APP_URL_PATH_PREFIX = "docs/";

// All path constants should end with a trailing slash
const SYNC_DIR = ARGS.sync;

// Hashes of files in the cloud
let objectHashes = new Map(); // { "music/lib/ooml.js" => F90DDD77E400DFE... }

// Hashes of files stored locally
let localHashes = new Map(); // { "lib/ooml.js" => F90DDD77E400DFE... }

let extraCloudFiles = [];
let missingCloudFiles = [];
let hashMismatchCloudFiles = [];
let pathsToInvalidate = [];

list({
  prefix: APP_URL_PATH_PREFIX,
})
  .then(data => {
    // Get all object keys, including ones that end with a slash (they should not be there)
    objectKeys = data.Contents.map(o => o.Key);

    return Promise.all(objectKeys.map(obj => getMetadata(obj)));
  })
  .then(objs => {
    return Promise.all(objs.filter(obj => {
      if (obj.metadata.sha512) {
        // If cloud file already has hash, get hash
        objectHashes.set(Path.relative(APP_URL_PATH_PREFIX, obj.key), obj.metadata.sha512);
      } else {
        return true;
      }
    }).map(obj => {
      console.log(obj.key + " does not have a SHA-512 hash, hashing...");

      // Get hash of file in the cloud
      return hashStream(APP_FILES_INTEGRITY_HASH, stream(obj.key), {key: obj.key});
    }));
  })
  .then(hashes => {
    return Promise.all(hashes.map(({metadata, hash}) => {
      console.log(`Hashed ${metadata.key}: ${hash}`);
      objectHashes.set(Path.relative(APP_URL_PATH_PREFIX, metadata.key), hash);

      return copy({
        keyFrom: metadata.key,
        keyTo: metadata.key,
        contentType: ContentType(Path.extname(metadata.key)) || "application/octet-stream",
        metadata: {
          sha512: hash,
        },
      });
    }));
  })
  .then(() => {
    // Get hashes of all local files
    return Promise.all(localFileNames.map(
      file => hashStream(APP_FILES_INTEGRITY_HASH, fs.createReadStream(SYNC_DIR + file), {file: file})));
  })
  .then(hashes => {
    hashes.forEach(({metadata, hash}) => {
      localHashes.set(metadata.file, hash);
    });
  })
  .then(() => {
    let cloudFiles = new Set(objectKeys.map(obj => Path.relative(APP_URL_PATH_PREFIX, obj)));
    let localFiles = new Set(localFileNames);

    function addS3ObjectToInvalidate (s3key) {
      let invalidation = "/" + APP_URL_PATH_PREFIX + s3key;
      pathsToInvalidate.push(invalidation);
      if (/\/index\.html$/.test(invalidation)) {
        pathsToInvalidate.push(Path.dirname(invalidation));
        pathsToInvalidate.push(Path.dirname(invalidation) + "/");
      }
    }

    cloudFiles.forEach(cf => {
      if (!localFiles.has(cf)) {
        extraCloudFiles.push(cf);
        addS3ObjectToInvalidate(cf);
      }
    });
    localFiles.forEach(lf => {
      if (!cloudFiles.has(lf)) {
        missingCloudFiles.push(lf);
        addS3ObjectToInvalidate(lf);
      } else {
        if (localHashes.get(lf) !== objectHashes.get(lf)) {
          hashMismatchCloudFiles.push(lf);
          addS3ObjectToInvalidate(lf);
        }
      }
    });

    if (!extraCloudFiles.length) {
      console.log("\nNo extra files");
    } else {
      console.log(`\nExtra files found on AWS to delete (${extraCloudFiles.length}):\n`);
      console.log(extraCloudFiles.join("\n"));
    }

    if (!missingCloudFiles.length) {
      console.log("\nNo missing files");
    } else {
      console.log(`\nMissing files not found on AWS upload (${missingCloudFiles.length}):\n`);
      console.log(missingCloudFiles.join("\n"));
    }

    if (!hashMismatchCloudFiles.length) {
      console.log("\nNo hash mismatch files");
    } else {
      console.log(`\nFiles with a different hash on AWS upload (${hashMismatchCloudFiles.length}):\n`);
      console.log(hashMismatchCloudFiles.join("\n"));
    }

    if (!extraCloudFiles.length && !missingCloudFiles.length && !hashMismatchCloudFiles.length) {
      console.log("\nNothing to do, sync complete");
      // WARNING: Script exits here
      process.exit(0);
    }

    return ask("\nAre you sure you want to sync? (y) ");
  })
  .then(answer => {
    if (answer.toLocaleLowerCase() != "y") {
      throw new Error("User cancelled process");
    }
  })
  .then(() => {
    console.log("\n=============== DELETING FILES ===============\n");
    if (extraCloudFiles.length) {
      return remove(...extraCloudFiles.map(f => APP_URL_PATH_PREFIX + f));
    }
  })
  .then(() => {
    console.log("\n=============== UPLOADING FILES ===============\n");
    return Promise.all(missingCloudFiles.concat(hashMismatchCloudFiles).map(file => {
      return upload({
        key: APP_URL_PATH_PREFIX + file,
        dataStream: fs.createReadStream(SYNC_DIR + file),
        contentType: ContentType(Path.extname(file)),
        metadata: {
          sha512: localHashes.get(file),
        },
      });
    }));
  })
  .then(() => {
    console.log("\n============== INVALIDATING FILES =============\n");
    return invalidate(...pathsToInvalidate);
  })
  // BUGFIX: Sometimes IntelliJ Node.js runner doesn't detect script ending
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
