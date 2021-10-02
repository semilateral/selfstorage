import { expect } from 'chai';
import { FSMoveEvent } from '../../src/js/FileSystem/FSEvent.js';
import { FSNode, FSBranchNode } from '../../src/js/FileSystem/FSNode.js';

describe('FSNode', function () {
  this.timeout(2000);

  it('should create a new named node with no parent', function () {
    const name1 = 'New_Node';
    const node1 = new FSNode(name1);

    expect(node1.name).to.equal(name1);
    expect(node1.parent).to.be.null;
  });

  it('should change its name when renamed', function () {
    const name1 = 'New_Node';
    const name2 = 'Different_Name';
    const node1 = new FSNode(name1);

    node1.rename(name2);

    expect(node1.name).to.equal(name2);
  });

  it('should dispatch a move event when renamed', function (done) {
    this.timeout(100);

    const name1 = 'New_Node';
    const name2 = 'Different_Name';
    const node1 = new FSNode(name1);

    node1.addListener('move', fsMoveEvent => {
      expect(fsMoveEvent.type).to.equal(FSMoveEvent.type);
      expect(fsMoveEvent.target).to.equal(node1);
      expect(fsMoveEvent.previousName).to.equal(name1);
      expect(fsMoveEvent.target.name).to.equal(name2);
      done();
    });
    node1.rename(name2);
  });

  it('should create a new node in a parent', function () {
    const parent1 = new FSBranchNode('parent');
    const node1 = new FSNode('child', parent1);

    expect(node1.parent).to.equal(parent1);
  });

  it('should dispatch a move event when moved', function (done) {
    const parent1 = new FSBranchNode('parent1');
    const parent2 = new FSBranchNode('parent2');
    const node1 = new FSNode('child', parent1);

    expect(node1.parent).to.equal(parent1);

    node1.addListener('move', fsMoveEvent => {
      expect(fsMoveEvent.type).to.equal(FSMoveEvent.type);
      expect(fsMoveEvent.target).to.equal(node1);
      expect(fsMoveEvent.previousParent).to.equal(parent1);
      expect(fsMoveEvent.target.parent).to.equal(parent2);
      done();
    });
    node1.moveTo(parent2);
  });

  it('should dispatch a move event when removed', function (done) {
    const parent1 = new FSBranchNode('parent1');
    const node1 = new FSNode('child', parent1);

    expect(node1.parent).to.equal(parent1);

    node1.addListener('move', fsMoveEvent => {
      expect(fsMoveEvent.type).to.equal(FSMoveEvent.type);
      expect(fsMoveEvent.target).to.equal(node1);
      expect(fsMoveEvent.previousParent).to.equal(parent1);
      expect(fsMoveEvent.target.parent).to.be.null;
      done();
    });
    node1.remove();
  });
});
