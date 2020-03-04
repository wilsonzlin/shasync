import * as fs from 'fs';
import {jogList} from 'fs-jogger';
import * as path from 'path';
import {hashStream} from '../Utils/hashStream';
import {HASH_TYPE, normaliseFilePath} from './common';

export interface IGetLocalHashesArgs {
  directory: string;
}

export const getLocalHashes = async ({
  directory,
}: IGetLocalHashesArgs): Promise<Map<string, string>> => {
  const files = await jogList({dir: directory});

  const hashes = await Promise.all(files.map(f => hashStream(HASH_TYPE, fs.createReadStream(path.join(directory, f)))));

  return new Map(files.map((f, i) => [normaliseFilePath(f), hashes[i]]));
};
