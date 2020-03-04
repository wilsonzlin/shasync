import * as crypto from 'crypto';
import ReadableStream = NodeJS.ReadableStream;

export const hashStream = (hashType: string, stream: ReadableStream): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(hashType);
    let sha512: string | undefined;

    hash.on('readable', () => {
      // Only one element is produced by the hash stream.
      // See https://nodejs.org/api/crypto.html#crypto_class_hash for more details.
      const data = hash.read() as Buffer;
      if (data) {
        sha512 = data.toString('hex');
      }
    });

    hash.on('finish', () => {
      if (sha512 === undefined) {
        throw new Error('Hash was not generated');
      }
      resolve(sha512);
    });

    hash.on('error', err => reject(err));

    stream.pipe(hash);
  });
};
