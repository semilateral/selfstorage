import { FSBranchNode } from './FSNode.js';

export class Directory extends FSBranchNode {
  list() {
    return Object.keys(this._children);
  }
}
