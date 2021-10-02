import { FSEvent } from './FSEvent.js';

class FSEventQueueEntry {
  constructor(fsEvent) {
    this.fsEvent = fsEvent;
    this.next = null;
    this.previous = null;
  }

  insertAfter(fsEventQueueEntry) {
    this._insertAdjacent(fsEventQueueEntry, true);
  }

  insertBefore(fsEventQueueEntry) {
    this._insertAdjacent(fsEventQueueEntry, false);
  }

  remove() {
    this._insertAdjacent(null, true);
  }

  _insertAdjacent(fsEventQueueEntry, insertAfter) {
    if (fsEventQueueEntry != this) {
      const before = insertAfter ? fsEventQueueEntry : fsEventQueueEntry && fsEventQueueEntry.previous;
      const after = insertAfter ? fsEventQueueEntry && fsEventQueueEntry.next : fsEventQueueEntry;

      if (this.previous) {
        this.previous.next = this.next;
      }

      if (this.next) {
        this.next.previous = this.previous;
      }

      this.previous = before;
      this.next = after;

      if (before) {
        before.next = this;
      }

      if (after) {
        after.previous = this;
      }
    }
  }
}

export class FSEventQueue {
  constructor(rootFSNode) {
    this._head = null;
    this._rootFSNode = rootFSNode;
    this._tail = null;

    rootFSNode.addListener(FSEvent.type, fsEvent => this._push(fsEvent));
  }

  get size() {
    let size = 0;

    for (let current = this._head; current; current = current.next) {
      ++size;
    }

    return size;
  }

  clear() {
    const items = [];

    for (let item; item = this.pop(); items.push(item));

    return items;
  }

  isEmpty() {
    return !this.peek();
  }

  peek(index = 0) {
    let entry = this._head;

    for (let i; entry && i < index; ++i) {
      entry = entry.next;
    }

    return entry && entry.fsEvent;
  }

  pop() {
    const head = this._removeStart();

    return head && head.fsEvent;
  }

  _insertEnd(fsEventQueueEntry) {
    if (this._head == fsEventQueueEntry) {
      this._head = fsEventQueueEntry.next;
    }

    fsEventQueueEntry.insertAfter(this._tail);
    this._tail = fsEventQueueEntry;
    this._head = this._head || fsEventQueueEntry;
  }

  _insertStart(fsEventQueueEntry) {
    if (this._tail == fsEventQueueEntry) {
      this._tail = fsEventQueueEntry.previous;
    }

    fsEventQueueEntry.insertBefore(this._head);
    this._head = fsEventQueueEntry;
    this._tail = this._tail || fsEventQueueEntry;
  }

  _push(fsEvent) {
    const relativeEvent = fsEvent.relativeTo(this._rootFSNode);
    const combinedEvent = this._tail && this._tail.fsEvent.combine(relativeEvent);

    if (combinedEvent) {
      this._removeEnd();
      this._insertEnd(new FSEventQueueEntry(combinedEvent));
    } else {
      this._insertEnd(new FSEventQueueEntry(relativeEvent));
    }
  }

  _removeEnd() {
    const tail = this._tail;

    if (tail) {
      this._tail = tail.previous;
      tail.remove();

      if (!this._tail) {
        this._head = null;
      }
    }

    return tail;
  }

  _removeStart() {
    const head = this._head;

    if (head) {
      this._head = head.next;
      head.remove();

      if (!this._head) {
        this._tail = null;
      }
    }

    return head;
  }
}
