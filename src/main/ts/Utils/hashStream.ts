import * as Crypto from "crypto";
import ReadableStream = NodeJS.ReadableStream;

export const hashStream = (hashType: string, stream: ReadableStream): Promise<string> => {
  return new Promise((resolve, reject) => {
    let hash = Crypto.createHash(hashType);
    let sha512 = "";

    hash.on("readable", () => {
      let data = hash.read() as Buffer;
      if (data) {
        sha512 = data.toString("hex");
      }
    });

    hash.on("finish", () => {
      resolve(sha512);
    });

    hash.on("error", err => {
      reject(err);
    });

    stream.pipe(hash);
  });
};
