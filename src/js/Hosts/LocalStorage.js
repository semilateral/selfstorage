import { Host } from '../Host.js';

export class LocalStorage extends Host {
  static get hostName() {
    return 'localStorage';
  }

  constructor() {
    super();

    this._localStorage = window.localStorage;
    this._localStorage.setItem('/', this._localStorage.getItem('/') || '{}');
  }

  async exists(path) {
    return this._localStorage.getItem(path) != null;
  }

  async _deleteFileUnsafe(path) {
    this._localStorage.removeItem(path);
    this._setExists(path, false);
  }

  async _isDirectoryUnsafe(path) {
    return typeof JSON.parse(this._localStorage.getItem(path)) == 'object';
  }

  async _listUnsafe(path) {
    return Object.keys(JSON.parse(this._localStorage.getItem(path)));
  }

  async _makeDirectoryUnsafe(path) {
    this._localStorage.setItem(path, '{}');
    this._setExists(path, true);
  }

  async _readFileUnsafe(path) {
    return JSON.parse(this._localStorage.getItem(path));
  }

  _setExists(path, exists) {
    const parentDir = JSON.parse(this._localStorage.getItem(path.dirname));

    if (exists) {
      parentDir[path.basename] = 1;
    } else {
      delete parentDir[path.basename];
    }

    this._localStorage.setItem(path.dirname, JSON.stringify(parentDir));
  }

  async _writeFileUnsafe(path, content) {
    this._localStorage.setItem(path, JSON.stringify(content));
    this._setExists(path, true);
  }
}
