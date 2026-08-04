import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService) {}

  /** Saves a file under the given key, returning the key to store as documents.storage_key. */
  async save(key: string, buffer: Buffer): Promise<string> {
    const provider = this.config.get<string>('STORAGE_PROVIDER', 'local');

    if (provider !== 'local') {
      throw new Error(
        `STORAGE_PROVIDER=${provider} is not implemented yet — pilot runs on 'local' only`,
      );
    }

    const basePath = this.config.get<string>('STORAGE_LOCAL_PATH', './storage');
    const fullPath = resolve(basePath, key);

    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);

    return key;
  }
}
