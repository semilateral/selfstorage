import { FSWriteEvent } from './FSEvent.js';
import { FSNode } from './FSNode.js';

export class File extends FSNode {
  constructor(name, parent = null, force = false, content = '') {
    super(name, parent);

    this.write(content);
  }

  copyTo(fsBranchNode, name = this._name, force = false) {
    return new this.constructor(fsBranchNode, name, force, this._content);
  }

  read() {
    return this._content;
  }

  write(content) {
    this._content = `${content}`;
    this.dispatchEvent(new FSWriteEvent(this));
  }
}
