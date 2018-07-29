import CDNService from "./CDNService";
import request = require("request");

export interface ICloudflareSettings {
  zoneID: string;
  site: string;
  email: string;
  globalAPIKey: string;
}

function assertValidKey (key: any): void {
  if (typeof key != "string" || key[0] != "/") {
    throw new SyntaxError(`Cloudflare keys must be a string and start with a forward slash (got "${key}")`);
  }
}

export default class extends CDNService {
  private readonly zoneID: string;
  private readonly site: string;
  private readonly email: string;
  private readonly globalAPIKey: string;

  constructor (settings: ICloudflareSettings) {
    super();
    this.zoneID = settings.zoneID;
    this.site = settings.site;
    this.email = settings.email;
    this.globalAPIKey = settings.globalAPIKey;
  }

  private _invalidateBatch (keys: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      request({
        method: "DELETE",
        url: `https://api.cloudflare.com/client/v4/zones/${this.zoneID}/purge_cache`,
        headers: {
          "X-Auth-Email": this.email,
          "X-Auth-Key": this.globalAPIKey,
        },
        body: {
          files: keys.map(key => `${this.site}${key}`),
        },
        json: true,
      }, (err, _, body) => {
        if (err) {
          reject(err);
          return;
        }

        if (body.errors) {
          body.errors.forEach((err: any) => console.error(`Error ${err.code}: ${err.message}`));
        }

        if (body.messages) {
          body.messages.forEach((msg: any) => console.info(msg));
        }

        if (body.success) {
          keys.forEach(key => {
            console.log(`Invalidated ${key}`);
          });

          resolve();
        } else {
          reject(new Error("Cloudflare API call not successful"));
        }
      });
    });
  }

  invalidate (...keys: string[]): Promise<void> {
    keys.forEach(key => assertValidKey(key));

    return new Promise((resolve, reject) => {
      let batches = [];
      do {
        batches.push(keys.splice(0, 500));
      } while (keys.length);

      Promise.all(batches.map(b => this._invalidateBatch(b)))
        .then(() => {
          resolve();
        })
        .catch(reject);
    });
  }
}
