import { expect } from 'chai';
import { FSNode, FSBranchNode } from '../../src/js/FileSystem/FSNode.js';

describe('FSBranchNode', function () {
  this.timeout(2000);

  it('should create a new node with no children', function () {
    const name1 = 'New_Node';
    const node1 = new FSBranchNode(name1);

    expect(node1.children.length).to.equal(0);
  });

  it('should add child nodes to its list of children', function () {
    const parent1 = new FSBranchNode('parent');
    const node1 = new FSNode('child1', parent1);

    expect(parent1.children.length).to.equal(1);
    expect(parent1.children[0]).to.equal(node1);

    const node2 = new FSNode('child2', parent1);

    expect(parent1.children.length).to.equal(2);
    expect(parent1.children.includes(node1) && parent1.children.includes(node2)).to.be.true;
  });

  it('should remove former child nodes from its list of children', function () {
    const parent1 = new FSBranchNode('parent');
    const node1 = new FSNode('child1', parent1);
    const node2 = new FSNode('child2', parent1);

    expect(parent1.children.length).to.equal(2);
    expect(parent1.children.includes(node1) && parent1.children.includes(node2)).to.be.true;

    node1.remove();

    expect(parent1.children.length).to.equal(1);
    expect(parent1.children[0]).to.equal(node2);
    expect(parent1.children.includes(node1)).to.be.false;

    node2.remove();

    expect(parent1.children.length).to.equal(0);
  });

  it('should not add the same child node twice if moved within', function () {
    const parent1 = new FSBranchNode('parent');
    const node1 = new FSNode('child', parent1);

    expect(parent1.children.length).to.equal(1);
    expect(parent1.children[0]).to.equal(node1);

    node1.moveTo(parent1, 'new_name', true);

    expect(parent1.children.length).to.equal(1);
    expect(parent1.children[0]).to.equal(node1);
  });

  it('should not contain itself', function () {
    const parent1 = new FSBranchNode('parent');

    expect(parent1.contains(parent1)).to.be.false;
  });

  it('should contain a child node', function () {
    const parent1 = new FSBranchNode('parent');
    const node1 = new FSNode('child', parent1);

    expect(parent1.contains(node1)).to.be.true;
  });

  it('should contain a grandchild node', function () {
    const grandparent1 = new FSBranchNode('grandparent');
    const parent1 = new FSBranchNode('parent', grandparent1);
    const node1 = new FSNode('child', parent1);

    expect(grandparent1.contains(node1)).to.be.true;
  });

  it('should not contain an unrelated node', function () {
    const parent1 = new FSBranchNode('parent');
    const node1 = new FSNode('child');

    expect(parent1.contains(node1)).to.be.false;
  });

  it('should not contain a parent node', function () {
    const parent1 = new FSBranchNode('parent');
    const node1 = new FSBranchNode('child', parent1);

    expect(node1.contains(parent1)).to.be.false;
  });

  it('should get a child by name', function () {
    const name1 = 'child1';
    const name2 = 'child2';
    const unusedName1 = 'unused1';
    const parent1 = new FSBranchNode('parent');
    const node1 = new FSBranchNode(name1, parent1);
    const node2 = new FSBranchNode(name2, parent1);

    expect(parent1.get(name1)).to.equal(node1);
    expect(parent1.get(name2)).to.equal(node2);
    expect(parent1.get(unusedName1)).to.be.null;
  });
});
