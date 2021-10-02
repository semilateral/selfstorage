import { FSEvent, FSMoveEvent } from './FSEvent.js';

function runCallback(callback, ...args) {
  try {
    callback(...args);
  } catch (err) {
    console.error(err);
  }
}

export class FSNode {
  constructor(name, parent = null, force = false) {
    this._changeListeners = {};
    this._name = name;
    this._parent = null;

    this.moveTo(parent, name, force);
  }

  get name() {
    return this._name;
  }

  get parent() {
    return this._parent;
  }

  get path() {
    return `${this._parent ? this._parent.path : ''}${this._name}`;
  }

  get splitPath() {
    const splitPath = this._parent ? this._parent.splitPath : [];

    splitPath.push(this.name);

    return splitPath;
  }

  addListener(type, callback) {
    this._changeListeners[type] = (this._changeListeners[type] || new Set()).add(callback);
  }

  clone() {
    return this.copyTo(null);
  }

  contains(fsNode) {
    return false;
  }

  copyTo(fsBranchNode, name = this._name, force = false) {
    return new this.constructor(fsBranchNode, name, force);
  }

  dispatchEvent(fsEvent) {
    for (const type of [fsEvent.type, FSEvent.type]) {
      (this._changeListeners[type] || []).forEach(cb => runCallback(cb, fsEvent));
    }

    if (fsEvent.bubbles && this._parent) {
      this._parent.dispatchEvent(fsEvent);
    }
  }

  moveTo(fsBranchNode, name = this._name, force = false) {
    if (fsBranchNode != this._parent || name != this._name) {
      if (fsBranchNode) {
        if (this == fsBranchNode || this.contains(fsBranchNode)) {
          throw new Error(`Error moving ${this.path} to ${fsBranchNode.path}${name}: Cannot move "${this.name}" within itself`);
        }

        const existing = fsBranchNode.get(name);

        if (existing) {
          if (force) {
            existing.remove();
          } else {
            throw new Error(`Error moving ${this.path} to ${fsBranchNode.path}${name}: "${this.name}" exists`);
          }
        }
      }

      const previousParent = this.parent;
      const previousPath = this.path;
      const previousName = this.name;

      this._parent = fsBranchNode;
      this._name = name;

      const fsMoveEvent = new FSMoveEvent(this, previousParent, previousPath, previousName);

      if (previousParent) {
        previousParent.dispatchEvent(fsMoveEvent);
      }

      this.dispatchEvent(fsMoveEvent);
    }
  }

  remove() {
    this.moveTo(null);
  }

  removeListener(type, callback) {
    const listeners = this._changeListeners[type];

    if (listeners) {
      this._changeListeners[type].delete(callback);
    }
  }

  rename(name, force = false) {
    this.moveTo(this._parent, name, force);
  }
}

export class FSBranchNode extends FSNode {
  constructor(name, parent = null, force = false) {
    super(name, parent, force);

    this._children = {};

    this.addListener(FSMoveEvent.type, this._handleFSMoveEvent.bind(this));
  }

  get children() {
    return Object.values(this._children);
  }

  get path() {
    return `${super.path}/`;
  }

  clone(recursive = false) {
    return this.copyTo(null, this._name, false, recursive);
  }

  contains(fsNode) {
    if (fsNode) {
      for (let ancestor = fsNode.parent; ancestor; ancestor = ancestor.parent) {
        if (ancestor == this) {
          return true;
        }
      }
    }

    return false;
  }

  copyTo(fsBranchNode, name = this._name, force = false, recursive = false) {
    const clone = super.copy(fsBranchNode, name, force);

    if (recursive) {
      for (const child of this.children) {
        child.copyTo(clone, child.name, force, recursive);
      }
    }

    return clone;
  }

  get(name) {
    return this._children[name] || null;
  }

  _handleFSMoveEvent(fsMoveEvent) {
    if (fsMoveEvent.previousParent == this) {
      const previousName = fsMoveEvent.previousName;
      const previousChild = this._children[previousName];

      if (previousChild && (previousChild.parent != this || previousChild.name != previousName)) {
        delete this._children[previousName];
      }
    }

    if (fsMoveEvent.target.parent == this) {
      this._children[fsMoveEvent.target.name] = fsMoveEvent.target;
    }
  }
}
