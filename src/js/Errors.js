/**
 * Indicates that a resource referenced by a path does not exist
 */
export class DoesNotExistError extends Error {
  /**
   * @param {FilePath} path
   * @param {...*} args Additional arguments to the Error constructor
   */
  constructor(path, ...args) {
    super(`No such file or directory: ${path}`, ...args);

    this.path = path;
  }
}

/**
 * Indicates that a resource referenced by a path is not a directory
 */
export class NotADirectoryError extends Error {
  /**
   * @param {FilePath} path
   * @param {...*} args Additional arguments to the Error constructor
   */
  constructor(path, ...args) {
    super(`Not a directory: ${path}`, ...args);

    this.path = path;
  }
}

/**
 * Indicates that a resource referenced by a path is not a file
 */
export class NotAFileError extends Error {
  /**
   * @param {FilePath} path
   * @param {...*} args Additional arguments to the Error constructor
   */
  constructor(path, ...args) {
    super(`Not a file: ${path}`, ...args);

    this.path = path;
  }
}
