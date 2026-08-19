import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService) {}

  /** Both save() and read() share this — one provider check, one path
   * resolution, so the two can never quietly disagree on where a key lives. */
  private resolvePath(key: string): string {
    const provider = this.config.get<string>('STORAGE_PROVIDER', 'local');
    if (provider !== 'local') {
      throw new Error(
        `STORAGE_PROVIDER=${provider} is not implemented yet — pilot runs on 'local' only`,
      );
    }
    const basePath = this.config.get<string>('STORAGE_LOCAL_PATH', './storage');
    return resolve(basePath, key);
  }

  /** Saves a file under the given key, returning the key to store as documents.storage_key. */
  async save(key: string, buffer: Buffer): Promise<string> {
    const fullPath = this.resolvePath(key);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
    return key;
  }

  /** The other half of save() — reads a document's bytes back by its
   * storage_key, for viewing/downloading it. */
  async read(key: string): Promise<Buffer> {
    return readFile(this.resolvePath(key));
  }
}
