# shasync

Syncronise local files with a cloud file storage provider. Can also invalidate changed remote files with a CDN.

## Features

- Ensure local and remote states match using SHA-512.
- Invalidates directory index files alongside directories (e.g. `/app/index.html` with `/app`).
- Currently supports S3 as remote file storage service; B2 support coming soon.
- Currently supports CloudFront and Cloudflare as CDN services.

## How it works

All files stored in the cloud are enumerated to retrieve their SHA-512 hashes stored in object metadata. If the hash doesn't exist, the file is downloaded to calculate the hash, and the hash is then saved to object metadata.

All files locally are also enumerated and are hashed using SHA-512.

Files present locally but not in the cloud are uploaded, while files in the cloud but not locally are deleted from cloud. Files that have changed according to hashes are uploaded. Paths to files changed in the cloud (uploaded or removed) are invalidated by the CDN.

## Usage

### CLI

#### Install

|Package manager|Command|
|---|---|
|npm|`npm i -g shasync`|
|yarn|`yarn global add shasync`|

#### Usage

See the help by running `shasync -h`. As an example:

```bash
export AWS_ACCESS_KEY_ID=abc
export AWS_SECRET_ACCESS_KEY=abc
export AWS_REGION=us-east-1
export AWS_DISTRIBUTION=abc
shasync \
  --directory /path/to/local/folder \
  --prefix remote/storage/prefix \
  --storage aws \
  --bucket mybucket \
  --cdn aws \
  --index index.html
``` 

### API

#### Install

For project use:

|Package manager|Command|
|---|---|
|npm|`npm i --save shasync`|
|yarn|`yarn add shasync`|

#### Usage

sacli comes with TypeScript typings. As an example:

```typescript
import * as shasync from 'shasync';

const storage = new shasync.S3({
  accessKeyID: 'AWSS3ACCESSKEYID',
  secretAccessKey: 'secretaccesskey',
  region: 'us-west-1',
  bucket: 'my-s3-bucket',
});

const cdn = new shasync.Cloudflare({
  zoneID: 'CFSITEZONEID',
  site: 'mysite.co',
  email: 'me@gmail.com',
  globalAPIKey: 'cfglobalapikey',
});

const diff = await shasync.diff({
  directory: '/path/to/local/dir',
  prefix: 'remote/dir/prefix',
  storageService: storage,
  directoryIndex: 'index.html',
});

await shasync.sync({
  diff,
  directory: '/path/to/local/dir',
  prefix: 'remote/dir/prefix',
  storageService: storage,
  CDNService: cdn,
});
```
