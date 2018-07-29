import {HASH_TYPE, normaliseFilePath} from "./__shared__";
import * as Path from "path";
import {jogList} from "fs-jogger/dist/jog/jogList";
import * as fs from "fs";
import {hashStream} from "../Utils/hashStream";

export interface IGetLocalHashesArgs {
  directory: string;
}

export const getLocalHashes = async (
  {
    directory,
  }: IGetLocalHashesArgs
): Promise<Map<string, string>> => {
  let files = await jogList({dir: directory});

  let hashes = await Promise.all(
    files.map(f =>
      hashStream(
        HASH_TYPE,
        fs.createReadStream(
          Path.join(directory, f)
        )
      )
    )
  );

  let hashMap: Map<string, string> = new Map();

  files.forEach((f, i) => {
    hashMap.set(normaliseFilePath(f), hashes[i]);
  });

  return hashMap;
};
