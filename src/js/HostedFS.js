import { Directory } from './FileSystem/Directory.js';
import { FSEventQueue } from './FileSystem/FSEventQueue.js';

export const FSSyncStatus = Object.freeze({
  IDLE: 0,
  PULLING: 1,
  PULL_FAILED: 2,
  PUSHING: 3,
  PUSH_FAILED: 4
});

export class HostedFS {
  constructor(host, directory = '') {
    this._currentEvent = null;
    this._host = host;
    this._root = new Directory(directory);
    this._syncPromise = Promise.resolve();
    this._syncStatus = FSSyncStatus.IDLE;

    this._fsEventQueue = new FSEventQueue(this._root);
  }

  get syncStatus() {
    return this._syncStatus;
  }

  async pull() {
    if (this.syncStatus == FSSyncStatus.IDLE) {
      this._syncStatus = FSSyncStatus.PULLING;

      await (this._syncPromise = new Promise((resolve, reject) => {
        // TODO
      }));
    }
  }

  async push() {
    if (this.syncStatus == FSSyncStatus.IDLE) {
      this._syncStatus = FSSyncStatus.PUSHING;

      await (this._syncPromise = new Promise(async (resolve, reject) => {
        try {
          while (this._currentEvent = this._fsEventQueue.pop()) {
            switch (this._currentEvent.type) {
              case 'create':
                if (this._currentEvent.isDirectory) {
                  await this._host.makeDirectory(this._currentEvent.path);
                } else {
                  await this._host.makeFile(this._currentEvent.path);
                }
                break;

              case 'delete':
                await this._host.delete(this._currentEvent.path);
                break;

              case 'move':
                await this._host.move(this._currentEvent.previousPath, this._currentEvent.path);
                break;

              case 'write':
                await this._host.writeFile(this._currentEvent.path, this._currentEvent.content);
                break;
            }
          }
        } catch (err) {
          reject(err); // TODO: More descriptive error handling
        }

        resolve();
      }));
    }
  }
}
