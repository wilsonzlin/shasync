import * as Crypto from "crypto";
import ReadableStream = NodeJS.ReadableStream;

export interface IStreamHash {
  hash: string;
  metadata: any;
}

export default (hashType: string, stream: ReadableStream, metadata: any): Promise<IStreamHash> => {
  return new Promise((resolve, reject) => {
    let hash = Crypto.createHash(hashType);
    let sha512 = "";

    hash.on('readable', () => {
      let data = hash.read() as Buffer;
      if (data) {
        sha512 = data.toString("hex");
      }
    });

    hash.on('finish', () => {
      resolve({ hash: sha512, metadata: metadata });
    });

    hash.on('error', err => {
      reject(err);
    });

    stream.pipe(hash);
  });
};
