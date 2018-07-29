import * as fs from "fs";

// TODO Return type
export default () => {
  let path = process.env["SHASYNC_CRED"];
  if (!path) {
    return null;
  }

  return JSON.parse(fs.readFileSync(path, "utf8"));
};
