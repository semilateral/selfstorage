import { FilePath } from './FileSystem/FilePath.js';
import { DoesNotExistError, NotADirectoryError, NotAFileError } from './Errors.js';

/**
 * Base class for a file host with methods for basic filesystem operations
 */
export class Host {
  /**
   * Human-readable name of the file host
   * @memberof Host
   * @abstract
   * @member {string} hostName
   * @readonly
   */

  /**
   * Get an error with a message in a standard format
   * @param {string} message
   * @returns {Error}
   */
  static error(message) {
    return new Error(`${this.name} -- ${message}`);
  }

  /**
   * Authenticate the user for the file host
   */
  async authenticate() {}

  // TODO: account for copies that would overwrite source files, e.g. /A/A => /A
  /**
   * Copy a file or directory. If path is a directory, copy recursively.
   * @param {FilePath} path
   * @param {FilePath} newPath
   * @throws {DoesNotExistError} Thrown if there is no file or directory at the source path
   */
  async copy(path, newPath) {
    if (await this.isDirectory(path)) {
      await this.makeDirectory(newPath);
      await Promise.all((await this.list(path)).map(async filename =>
        await this.copy(path.join(filename), newPath.join(filename))
      ));
    } else {
      await this.writeFile(newPath, await this.readFile(path));
    }
  }

  /**
   * Delete a file or directory. If path is a directory, delete recursively.
   * @param {FilePath} path
   */
  async delete(path) {
    let isDirectory;

    try {
      isDirectory = await this.isDirectory(path);
    } catch (err) {
      if (err instanceof DoesNotExistError) {
        return;
      }

      throw err;
    }

    if (isDirectory) {
      await Promise.all((await this.list(path)).map(async filename =>
        await this.delete(path.join(filename))
      ));

      if (path != '/') {
        await this._deleteDirectoryUnsafe(path);
      }
    } else {
      await this._deleteFileUnsafe(path);
    }
  }

  /**
   * Whether a file or directory exists at the given path
   * @memberof Host
   * @abstract
   * @instance
   * @function exists
   * @async
   * @param {FilePath} path
   * @returns {boolean}
   */

  /**
   * true if a path is a directory, false if it is a file. Throws an error if path does not exist.
   * @param {FilePath} path
   * @returns {boolean}
   * @throws {DoesNotExistError} Thrown if there is no file or directory at the path
   */
  async isDirectory(path) {
    if (await this.exists(path)) {
      return await this._isDirectoryUnsafe(path);
    }

    throw new DoesNotExistError(path);
  }

  /**
   * List all files and directories in a directory
   * @param {FilePath} path
   * @returns {string[]} Sorted array of file and directory names
   * @throws {DoesNotExistError} Thrown if there is no file or directory at the path
   * @throws {NotADirectoryError} Thrown if the path exists and does not specify a directory
   */
  async list(path) {
    if (await this.isDirectory(path)) {
      return (await this._listUnsafe(path)).sort();
    }

    throw new NotADirectoryError(path);
  }

  /**
   * Create an empty directory at the path if there is not a directory there already. If the path is
   * a file, it will be deleted.
   * @param {FilePath} path
   */
  async makeDirectory(path) {
    let fileExists = false;
    let directoryExists = false;

    try {
      directoryExists = await this.isDirectory(path);
      fileExists = !directoryExists;
    } catch (err) {
      if (!(err instanceof DoesNotExistError)) {
        throw err;
      }
    }

    if (fileExists) {
      await this._deleteFileUnsafe(path);
    }

    if (!directoryExists) {
      const parent = new FilePath(path.dirname);

      if (!parent.equals(path) && !(await this.exists(parent))) {
        await this.makeDirectory(parent);
      }

      await this._makeDirectoryUnsafe(path);
    }
  }

  /**
   * Create an empty file at the path if there is not a file there already. If the path is a
   * directory, it will be deleted.
   * @param {FilePath} path
   */
  async makeFile(path) {
    try {
      // If a file exists
      if (!(await this.isDirectory(path))) {
        return;
      }
    } catch (err) {
      if (!(err instanceof DoesNotExistError)) {
        throw err;
      }
    }

    await this.writeFile(path, '');
  }

  /**
   * Move a file or directory. If path is a directory, move recursively.
   * @param {FilePath} path
   * @param {FilePath} newPath
   * @throws {DoesNotExistError} Thrown if there is no file or directory at the source path
   */
  async move(path, newPath) {
    await this.copy(path, newPath);
    await this.delete(path);
  }

  /**
   * Read the content of a file in its entirety
   * @param {FilePath} path
   * @returns {string} The content of the file
   * @throws {DoesNotExistError} Thrown if there is no file or directory at the path
   * @throws {NotAFileError} Thrown if the path exists and does not specify a file
   */
  async readFile(path) {
    if (await this.isDirectory(path)) {
      throw new NotAFileError(path);
    }

    return await this._readFileUnsafe(path);
  }

  // TODO: throw error when attempting to write over root directory
  /**
   * Write text to a file. If a file exists at the path, it will be deleted.
   * @memberof Host
   * @abstract
   * @instance
   * @function writeFile
   * @async
   * @param {FilePath} path
   * @param {string} content
   */
  async writeFile(path, content) {
    await this.delete(path);
    await this.makeDirectory(new FilePath(path.dirname));
    await this._writeFileUnsafe(path, content);
  }

  /**
   * Delete a directory. Assumes that it exists and is empty.
   * @async
   * @param {FilePath} path
   */
  async _deleteDirectoryUnsafe(path) {
    await this._deleteFileUnsafe(path);
  }

  /**
   * Delete a file. Assumes that it exists.
   * @memberof Host
   * @protected
   * @abstract
   * @instance
   * @function _deleteFileUnsafe
   * @async
   * @param {FilePath} path
   */

  /**
   * true if a path is a directory, false if it is a file. Assumes that the path exists.
   * @memberof Host
   * @protected
   * @abstract
   * @instance
   * @function _isDirectoryUnsafe
   * @async
   * @param {FilePath} path
   * @returns {boolean}
   */

  /**
   * List all files and directories in a directory. Assumes that the directory exists.
   * @memberof Host
   * @protected
   * @abstract
   * @instance
   * @function _listUnsafe
   * @async
   * @param {FilePath} path
   * @returns {string[]} Array of file and directory names
   */

  /**
   * Create an empty directory. Assumes the parent directory exists and nothing exists at the path.
   * @memberof Host
   * @protected
   * @abstract
   * @instance
   * @function _makeDirectoryUnsafe
   * @async
   * @param {FilePath} path
   */

  /**
   * Read the content of a file in its entirety. Assumes the file exists.
   * @memberof Host
   * @protected
   * @abstract
   * @instance
   * @function _readFileUnsafe
   * @async
   * @param {FilePath} path
   * @returns {string} The content of the file
   */

  /**
   * Write text to a file. Assumes the parent directory exists and nothing exists at the path.
   * @memberof Host
   * @protected
   * @abstract
   * @instance
   * @function _writeFileUnsafe
   * @async
   * @param {FilePath} path
   * @param {string} content
   */
}
