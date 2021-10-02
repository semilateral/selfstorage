import { FSBranchNode } from './FSNode.js';

export class FSEvent {
  static get type() {
    return 'event';
  }

  constructor(target) {
    this._path = target.path;
    this._target = target;

    this.bubbles = true;
  }

  get path() {
    return this._path;
  }

  get target() {
    return this._target;
  }

  get type() {
    return this.constructor.type;
  }

  combine(fsEvent) {
    return fsEvent == this ? this : null;
  }

  relativeTo(fsNode) {
    return this;
  }
}

// FSNode Events

export class FSMoveEvent extends FSEvent {
  static get type() {
    return 'move';
  }

  /**
   * @param {FSNode?} previousParent
   * @param {string} previousPath
   * @param {string} previousName
   */
  constructor(target, previousParent, previousPath, previousName) {
    super(target);

    this._name = target.name;
    this._parent = target.parent;
    this._previousName = previousName;
    this._previousParent = previousParent;
    this._previousPath = previousPath;
  }

  get name() {
    return this._name;
  }

  get parent() {
    return this._parent;
  }

  get previousName() {
    return this._previousName;
  }

  get previousParent() {
    return this._previousParent;
  }

  get previousPath() {
    return this._previousPath;
  }

  combine(fsEvent) {
    if (
      fsEvent instanceof FSMoveEvent
      && fsEvent.target == this.target
      && this.parent == fsEvent.previousParent
      && this.name == fsEvent.previousName
    ) {
      return new FSMoveEvent(fsEvent.target, this.previousParent, this.previousName);
    }

    return super.combine(fsEvent);
  }

  relativeTo(fsNode) {
    const previouslyContained = fsNode && (fsNode == this.previousParent || fsNode.contains(this.previousParent));

    if (fsNode && fsNode.contains(this.target)) {
      return previouslyContained ? this : new FSCreateEvent(this.target);
    }

    if (previouslyContained) {
      return new FSDeleteEvent(this.target);
    }

    return fsNode == this.target && this.name != this.previousName ? this : new FSEvent(this.target);
  }
}

export class FSCreateEvent extends FSMoveEvent {
  static get type() {
    return 'create';
  }

  constructor(target) {
    super(target, null, '', '');
  }

  get isDirectory() {
    return this.target instanceof FSBranchNode;
  }
}

export class FSDeleteEvent extends FSMoveEvent {
  static get type() {
    return 'delete';
  }

  constructor(target) {
    super(target);

    this._name = '';
    this._parent = null;
    this._path = '';
  }
}

// File Events

export class FSWriteEvent extends FSEvent {
  static get type() {
    return 'write';
  }

  constructor(target) {
    super(target);

    this._content = target.read();
  }

  get content() {
    return this._content;
  }

  combine(fsEvent) {
    if (fsEvent instanceof FSWriteEvent && fsEvent.target == this.target) {
      return new FSWriteEvent(fsEvent.target);
    }

    return super.combine(fsEvent);
  }
}
