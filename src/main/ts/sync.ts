import {jogList} from "fs-jogger/dist/jog/jogList";
import S3 from "./StorageService/S3";
import Cloudflare from "./CDNService/Cloudflare";
import CloudFront from "./CDNService/CloudFront";
import StorageService from "./StorageService/StorageService";
import CDNService from "./CDNService/CDNService";

export enum StorageServiceType {
  S3,
}

const STORAGE_SERVICE_CLASS: { [service: number]: new (...args: any[]) => StorageService } = {
  [StorageServiceType.S3]: S3,
};

export enum CDNServiceType {
  CLOUDFRONT,
  CLOUDFLARE,
}

const CDN_SERVICE_CLASS: { [service: number]: new (...args: any[]) => CDNService } = {
  [CDNServiceType.CLOUDFLARE]: Cloudflare,
  [CDNServiceType.CLOUDFRONT]: CloudFront,
};

export interface ISyncSettings {
  directory: string;
  storageService: StorageServiceType;
  CDNService: CDNServiceType;
}

type FilesList = string[];

export default async (
  {
    directory,
    storageService,
    CDNService,
  }: ISyncSettings
) => {
  let storageServiceController = new STORAGE_SERVICE_CLASS[storageService]();
  if (!storageServiceController) {
    throw new TypeError(`Invalid storage service`);
  }

  let CDNServiceController = new CDN_SERVICE_CLASS[CDNService]();
  if (!CDNServiceController) {
    throw new TypeError(`Invalid CDN service`);
  }

  // Paths of all the files stored locally (folders not included)
  let localFiles: FilesList = await jogList({dir: directory}); // [ index.html, lib/ooml.js, ... ]

  // Paths of all the files remotely
  let remoteFiles: FilesList = await storageServiceController.list(); // [ music/index.html, music/lib/ooml.js, ... ]
};
