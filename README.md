# shasync

Syncronise local files with a cloud file storage provider. Can also invalidate changed remote files with a CDN.

## Features

- Ensure local and remote state matches using SHA-512.
- Can also invalidate directories alongside directory index files (e.g. `/app` with `/app/index.html`).
- Currently supports S3 as remote file storage service; B2 support coming soon.
- Currently supports CloudFront and Cloudflare as CDN service.

## Usage

### CLI

#### Install

|Package manager|Command|
|---|---|
|npm|`npm i -g shasync`|
|yarn|`yarn global add shasync`|

#### Usage

Coming soon.

### API

#### Install

For project use:

|Package manager|Command|
|---|---|
|npm|`npm i --save shasync`|
|yarn|`yarn add shasync`|

#### Usage

Example:

```typescript
import * as shasync from "shasync";

shasync.sync({
  directory: "/path/to/local/dir",
  prefix: "remote/dir/prefix" || undefined,
  storageService: new shasync.S3({
    accessKeyID: "AWSS3ACCESSKEYID",
    secretAccessKey: "secretaccesskey",
    region: "us-west-1",
    bucket: "my-s3-bucket",
  }),
  CDNService: new shasync.Cloudflare({
    zoneID: "CFSITEZONEID",
    site: "mysite.co",
    email: "me@gmail.com",
    globalAPIKey: "cfglobalapikey",
  }),

  directoryIndex: "index.html" || undefined,
});
```
