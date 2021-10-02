import { expect } from 'chai';
import { FSMoveEvent, FSDeleteEvent, FSWriteEvent } from '../../src/js/FileSystem/FSEvent.js';
import { FSEventQueue } from '../../src/js/FileSystem/FSEventQueue.js';
import { FSNode, FSBranchNode } from '../../src/js/FileSystem/FSNode.js';

describe('FSEventQueue', function () {
  this.timeout(2000);

  it('should create a new empty queue', function () {
    const root = new FSBranchNode('root');
    const queue = new FSEventQueue(root);

    expect(queue.isEmpty()).to.be.true;
  });

  it('should enqueue an FSMoveEvent when the root is renamed', function () {
    const rootName1 = 'root_before';
    const rootName2 = 'root_after';
    const root = new FSBranchNode(rootName1);
    const queue = new FSEventQueue(root);

    root.rename(rootName2);

    expect(queue.isEmpty()).to.be.false;
    expect(queue.pop().type).to.equal(FSMoveEvent.type);
    expect(queue.isEmpty()).to.be.true;
  });

  it('should remove an event from the queue when popped', function () {
    const rootName1 = 'root_before';
    const rootName2 = 'root_after';
    const root = new FSBranchNode(rootName1);
    const queue = new FSEventQueue(root);

    root.rename(rootName2);

    expect(queue.isEmpty()).to.be.false;

    queue.pop();

    expect(queue.isEmpty()).to.be.true;
  });

  it('should enqueue an FSMoveEvent when a descendent of the root is renamed', function () {
    const name1 = 'before';
    const name2 = 'after';
    const root = new FSBranchNode('root');
    const child = new FSBranchNode(name1, root);
    const queue = new FSEventQueue(root);

    child.rename(name2);

    expect(queue.isEmpty()).to.be.false;
    expect(queue.pop().type).to.equal(FSMoveEvent.type);
    expect(queue.isEmpty()).to.be.true;
  });

  it('should enqueue an FSMoveEvent when a descendent of the root is moved', function () {
    const parentName1 = 'before';
    const parentName2 = 'after';
    const root = new FSBranchNode('root');
    const parent1 = new FSBranchNode(parentName1, root);
    const parent2 = new FSBranchNode(parentName2, root);
    const child = new FSBranchNode('child', parent1);
    const queue = new FSEventQueue(root);

    child.moveTo(parent2);

    expect(queue.isEmpty()).to.be.false;
    expect(queue.pop().type).to.equal(FSMoveEvent.type);
    expect(queue.isEmpty()).to.be.true;
  });

  it('should enqueue an FSMoveEvent when a descendent of the root is removed', function () {
    const root = new FSBranchNode('root');
    const parent = new FSBranchNode('parent', root);
    const child = new FSBranchNode('child', parent);
    const queue = new FSEventQueue(root);

    child.remove();

    expect(queue.isEmpty()).to.be.false;
    expect(queue.pop().type).to.equal(FSDeleteEvent.type);
    expect(queue.isEmpty()).to.be.true;
  });

  it('should remove equivalent events on siblings in the order they are pushed', function () {
    const name1Before = 'before1';
    const name1After = 'after1';
    const name2Before = 'before2';
    const name2After = 'after2';
    const root = new FSBranchNode('root');
    const child1 = new FSBranchNode(name1Before, root);
    const child2 = new FSBranchNode(name2Before, root);
    const queue = new FSEventQueue(root);

    child1.rename(name1After);
    child2.rename(name2After);

    expect(queue.isEmpty()).to.be.false;
    expect(queue.pop().target).to.equal(child1);
    expect(queue.isEmpty()).to.be.false;
    expect(queue.pop().target).to.equal(child2);
    expect(queue.isEmpty()).to.be.true;
  });
});
