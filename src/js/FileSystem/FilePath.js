/**
 * String-like representation of a file path
 */
export class FilePath {
  /**
   * @param {string} path File path
   * @param {Object} [options={}]
   * @param {string} [options.currentDirectory='.'] Path symbol for the current directory
   * @param {string} [options.parentDirectory='..'] Path symbol for the parent directory
   * @param {string} [options.separator='/'] Path separator character -- must be a single character
   */
  constructor(path, {
    currentDirectory = '.',
    parentDirectory = '..',
    separator = '/'
  } = {}) {
    this._currentDirectory = `${currentDirectory}`;
    this._parentDirectory = `${parentDirectory}`;
    this._separator = `${separator}`;

    if (this._separator.length != 1) {
      throw new Error('FilePath separator must be a single character');
    }

    const strPath = `${path}`;
    const parts = strPath.split(this._separator)
      .filter(part => part && part != this._currentDirectory);

    for (let i = 1; i < parts.length; ++i) {
      if (i && parts[i] == this._parentDirectory && parts[i - 1] != this._parentDirectory) {
        parts.splice(i - 1, 2);
        i -= 2;
      }
    }

    const isAbsolute = this._isAbsolute(strPath);

    if (isAbsolute) {
      const firstNonParentIndex = parts.findIndex(part => part != this._parentDirectory);

      parts.splice(0, firstNonParentIndex == -1 ? parts.length : firstNonParentIndex);
    }

    this._path = `${isAbsolute ? this._separator : ''}${parts.join(this._separator)}`;
    this._basenameStart = this._path.length - (parts[parts.length - 1] || '').length;
  }

  /**
   * Filename portion of path
   * @readonly
   * @type {string}
   */
  get basename() {
    return this._path.substring(this._basenameStart, this._path.length) || this._path;
  }

  /**
   * Path symbol for the current directory used by this path
   * @readonly
   * @type {string}
   */
  get currentDirectory() {
    return this._currentDirectory;
  }

  /**
   * Directory portion of path
   * @readonly
   * @type {string}
   */
  get dirname() {
    return this._path.substring(0, this._basenameStart - 1) || (this.isAbsolute ? this._separator : this._currentDirectory);
  }

  /**
   * true if this is an absolute path, false if it is a relative path
   * @readonly
   * @type {boolean}
   */
  get isAbsolute() {
    return this._isAbsolute();
  }

  /**
   * The length of the path string
   * @readonly
   * @type {number}
   */
  get length() {
    return this._path.length;
  }

  /**
   * Path symbol for the parent directory used by this path
   * @readonly
   * @type {string}
   */
  get parentDirectory() {
    return this._parentDirectory;
  }

  /**
   * Path separator character used by this path
   * @readonly
   * @type {string}
   */
  get separator() {
    return this._separator;
  }

  /**
   * Whether this path is equivalent to another path
   * @param {FilePath} path
   * @returns {boolean}
   */
  equals(path) {
    return `${this}` == `${path}`;
  }

  /**
   * Join this path with other paths. Relative paths are evaluated based on the path it is joined
   * with. Joining an absolute path to a relative path will evaluate to the absolute path.
   * @param {...FilePath|string} paths
   * @returns {FilePath}
   */
  join(...paths) {
    paths.unshift(this);
    paths.forEach((path, i) => paths[i] = `${path}`);

    let startIndex = paths.length;

    // Start from the last absolute path or the first path if none are absolute
    while (--startIndex && !this._isAbsolute(paths[startIndex]));

    return new this.constructor(paths.splice(startIndex).join(this._separator), this);
  }

  /**
   * @returns {string}
   */
  toString() {
    return this._path;
  }

  /**
   * @private
   * @param {string} [path=this._path]
   * @returns {boolean} Whether the path is an absolute path
   */
  _isAbsolute(path = this._path) {
    return path[0] == this._separator;
  }
}
