import { Host } from '../Host.js';

export class GoogleDrive extends Host {
  static get maxUploadChunkSize() {
    return 5242880; // 5 MB
  }

  static get hostName() {
    return 'Google Drive';
  }

  static get uploadChunkFactor() {
    return 262144; // 256 KB
  }

  static get _folderMimeType() {
    return 'application/vnd.google-apps.folder';
  }

  static get _maxQueryPageSize() {
    return 1000;
  }

  static get _rootFileId() {
    return 'root';
  }

  static uploadChunkSizeIsValid(uploadChunkSize) {
    return typeof uploadChunkSize == 'number'
      && uploadChunkSize > 0
      && uploadChunkSize <= this.maxUploadChunkSize
      && uploadChunkSize % this.uploadChunkFactor == 0;
  }

  static _parseByteRange(range) {
    if (!range || !/^bytes=\d+-\d+$/.test(range)) {
      throw this.constructor.error(`Error parsing byte range: Range missing or invalid`);
    }

    const [min, max] = range.match(/\d+/g).map(str => window.parseInt(str));

    if (!(min <= max)) {
      throw this.constructor.error(`Error parsing byte range: Invalid range ${min}-${max}`);
    }

    return [min, max];
  }

  constructor(clientId, authRedirectUri, {
    authCheckPeriod = 200,
    maxUploadAttempts = 3,
    uploadChunkSize = GoogleDrive.maxUploadChunkSize
  } = {}) {
    super();

    this.authCheckPeriod = authCheckPeriod;
    this.maxUploadAttempts = maxUploadAttempts;
    this.uploadChunkSize = uploadChunkSize;

    this._clientId = clientId;
    this._authRedirectUri = authRedirectUri;
    this._accessTokenPromise = new Promise(resolve => this._resolveAccessToken = resolve);
  }

  get uploadChunkSize() {
    return this._uploadChunkSize;
  }

  set uploadChunkSize(uploadChunkSize) {
    if (!this.constructor.uploadChunkSizeIsValid(uploadChunkSize)) {
      throw this.constructor.error(`Invalid upload chunk size: ${uploadChunkSize}`);
    }

    this._uploadChunkSize = uploadChunkSize;
  }

  async authenticate() {
    this._clearAuthInterval();
    this._authWindow = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this._clientId}&redirect_uri=${this._authRedirectUri}&response_type=token&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file`
    );
    this._authInterval = window.setInterval(() => this._checkAuthWindow(), this.authCheckPeriod);

    await new Promise((resolve, reject) => {
      this._resolveAuth = resolve;
      this._rejectAuth = reject;
    });
  }

  async _deleteFileUnsafe(path) {
    const accessToken = await this._accessTokenPromise;
    const pathId = await this._idForPath(path);
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${pathId}`,
      {
        'headers': { 'Authorization': `Bearer ${accessToken}` },
        'method': 'DELETE'
      }
    );

    if (!response.ok) {
      throw this.constructor.error(`Error deleting '${path}': Response status ${response.status}`);
    }
  }

  async _isDirectoryUnsafe(path) {
    const parentPath = path.join('..');
    const name = path.basename;
    const parentId = await this._idForPath(parentPath);

    try {
      const [file] = await this._queryFiles({ name, parentId }, { fields: ['mimeType'], limit: 1 });

      return file.mimeType == this.constructor._folderMimeType;
    } catch (err) {
      throw this.constructor.error(`Error getting MIME type for path '${path}': ${err.message}`);
    }
  }

  _checkAuthWindow() {
    if (!this._authWindow || this._authWindow.closed) {
      this._clearAuthInterval();
    } else {
      let responseParams;

      try {
        if (!this._authWindow.location.href.startsWith(`${this._authRedirectUri}#`)) {
          return;
        }

        responseParams = new URLSearchParams(this._authWindow.location.hash.substring(1));
      } catch {
        return;
      }

      const accessToken = responseParams.get('access_token');

      if (accessToken) {
        this._resolveAccessToken(accessToken);
        this._clearAuthInterval();
      } else {
        this._clearAuthInterval(this.constructor.error(`No access token in redirect URI "${this._authWindow.location.href}"`));
      }
    }
  }

  _clearAuthInterval(err = null) {
    if (this._authInterval) {
      window.clearInterval(this._authInterval);
      this._authInterval = null;

      if (this._authWindow) {
        this._authWindow.close();
      }

      if (err) {
        this._rejectAuth(err);
      } else {
        this._resolveAuth();
      }
    }
  }

  async _idForPath(path) {
    if (!path || path == '/') {
      return this.constructor._rootFileId;
    }

    const [parentPath, name] = Path.split(path);
    const parentId = await this._idForPath(parentPath);

    try {
      const [file] = await this._queryFiles({ name, parentId }, { fields: ['id'], limit: 1 });

      return (file || {}).id || null;
    } catch (err) {
      throw this.constructor.error(`Error getting ID for path '${path}': ${err.message}`);
    }
  }

  async _initiateUpload(path) {
    const accessToken = await this._accessTokenPromise;
    const [parentPath, name] = Path.split(path);
    const parentId = await this._idForPath(parentPath);
    const body = JSON.stringify({
      'name': name,
      ...(parentId ? { 'parents': [parentId] } : {})
    });
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      'body': body,
      'headers': {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Length': new Blob([body]).size,
        'Content-Type': 'application/json; charset=UTF-8'
      },
      'method': 'POST'
    });

    if (!response.ok) {
      throw this.constructor.error(`Error initiating resumable upload: Response status ${response.status}`);
    }

    const uploadUrl = response.headers.get('Location');

    if (!uploadUrl) {
      throw this.constructor.error(`Error initiating resumable upload: No upload URL in response`);
    }

    return uploadUrl;
  }

  async _listUnsafe(path) {
    const pathId = await this._idForPath(path);

    try {
      return (await this._queryFiles({ parentId: pathId }, { fields: ['name'] }))
        .map(file => file.name);
    } catch (err) {
      throw this.constructor.error(`Error listing files in path '${path}': ${err.message}`);
    }
  }

  async _makeDirectoryUnsafe(path) {
    const accessToken = await this._accessTokenPromise;
    const parentPath = path.join('..');
    const name = path.basename;
    const parentId = await this._idForPath(parentPath);
    const body = JSON.stringify({
      'mimeType': this.constructor._folderMimeType,
      'name': name,
      ...(parentId ? { 'parents': [parentId] } : {})
    });
    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      'body': body,
      'headers': {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Length': new Blob([body]).size,
        'Content-Type': 'application/json; charset=UTF-8'
      },
      'method': 'POST'
    });

    if (!response.ok) {
      throw this.constructor.error(`Error creating directory '${path}': Response status ${response.status}`);
    }
  }

  async _queryFiles({
    name = null,
    parentId = null,
    trashed = false
  }, {
    fields = ['id', 'mimeType', 'name'],
    limit = Infinity
  }) {
    // TODO: Implement paging for queries with more than 1000 results

    const accessToken = await this._accessTokenPromise;
    const queryParts = [];

    if (name != null) {
      queryParts.push(`name+=+'${encodeURIComponent(name)}'`);
    }
    if (parentId != null) {
      queryParts.push(`'${parentId}'+in+parents`);
    }
    if (!trashed) {
      queryParts.push('trashed+=+false');
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${queryParts.join('+and+')}&fields=files(${fields.join(',')})&pageSize=${Math.min(limit, this.constructor._maxQueryPageSize)}`,
      {
        'headers': { 'Authorization': `Bearer ${accessToken}` },
        'method': 'GET'
      }
    );

    if (!response.ok) {
      throw this.constructor.error(`Error getting file metadata: Response status ${response.status}`);
    }

    try {
      return (await response.json()).files || [];
    } catch (err) {
      throw this.constructor.error(`Error parsing file metadata response: ${err.message}`);
    }
  }

  async _readFileUnsafe(path) {
    const accessToken = await this._accessTokenPromise;
    const pathId = await this._idForPath(path);
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${pathId}?alt=media`,
      {
        'headers': { 'Authorization': `Bearer ${accessToken}` },
        'method': 'GET'
      }
    );

    if (!response.ok) {
      throw this.constructor.error(`Error reading file '${path}': Response status ${response.status}`);
    }

    try {
      return await response.text();
    } catch (err) {
      throw this.constructor.error(`Error reading file '${path}': ${err.message}`);
    }
  }

  async _resumableUpload(uploadUrl, arrayBuffer, firstByte = 0) {
    const uploadChunkSize = this.uploadChunkSize;

    for (let byte = firstByte; byte < arrayBuffer.byteLength;) {
      const response = await this._uploadChunk(uploadUrl, arrayBuffer, byte, uploadChunkSize);

      if (response.ok) {
        break;
      } else if (response.status == 308) {
        const range = response.headers.get('Range');
        const max = this.constructor._parseByteRange(range)[1];

        byte = max + 1;
      } else {
        throw this.constructor.error(`Error during resumable upload: Response status ${response.status}`);
      }
    }
  }

  async _resumeIncompleteUpload(path, uploadUrl, arrayBuffer) {
    const accessToken = await this._accessTokenPromise;
    const response = await fetch(uploadUrl, {
      'headers': {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Range': `bytes */${arrayBuffer.byteLength}`
      },
      'method': 'PUT'
    });

    if (response.status == 308) {
      const range = response.headers.get('Range');
      const max = this.constructor._parseByteRange(range)[1];

      return await this._resumableUpload(uploadUrl, arrayBuffer, max + 1);
    }

    if (!response.ok) {
      const newUploadUrl = await this._initiateUpload(path);

      return await this._resumableUpload(newUploadUrl, arrayBuffer);
    }
  }

  async _uploadChunk(uploadUrl, arrayBuffer, firstByte, chunkSize) {
    const accessToken = await this._accessTokenPromise;
    const lastByte = Math.min(firstByte + chunkSize, arrayBuffer.byteLength) - 1;

    return await fetch(uploadUrl, {
      'body': arrayBuffer.slice(firstByte, lastByte + 1),
      'headers': {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Length': arrayBuffer.byteLength,
        'Content-Range': `bytes ${firstByte}-${lastByte}/${arrayBuffer.byteLength}`
      },
      'method': 'PUT'
    });
  }

  async _writeFileUnsafe(path, content) {
    const [uploadUrl, arrayBuffer] = await Promise.all([
      this._initiateUpload(path),
      new Blob([content]).arrayBuffer()
    ]);
    const errors = [];

    try {
      await this._resumableUpload(uploadUrl, arrayBuffer);
      return;
    } catch (err) {
      errors.push(err);
    }

    for (let i = 1; i < this.maxUploadAttempts; i++) {
      try {
        await this._resumeIncompleteUpload(path, uploadUrl, arrayBuffer);
        return;
      } catch (err) {
        errors.push(err);
      }
    }

    throw this.constructor.error(`Error uploading file: Too many failed upload attempts\nUploads failed with the following errors:\n${errors.join('\n')}`);
  }
}
