import * as fs from "fs";

// TODO Return type
export default () => {
  let path = process.env["SHASYNC_RES"];
  if (!path) {
    return null;
  }

  return JSON.parse(fs.readFileSync(path, "utf8"));
};
