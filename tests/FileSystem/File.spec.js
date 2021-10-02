import { expect } from 'chai';
import { File } from '../../src/js/FileSystem/File.js';
import { FSWriteEvent } from '../../src/js/FileSystem/FSEvent.js';

describe('File', function () {
  this.timeout(2000);

  it('should create a new file with no content', function () {
    const file1 = new File('file1');

    expect(file1.read()).to.equal('');
  });

  it('should change content when written', function () {
    const content1 = 'content1';
    const file1 = new File('file1');

    expect(file1.read()).to.equal('');

    file1.write(content1);

    expect(file1.read()).to.equal(content1);
  });

  it('should dispatch a write event when written to', function (done) {
    this.timeout(100);

    const content1 = 'content1';
    const file1 = new File('file1');

    file1.addListener('write', fsWriteEvent => {
      expect(fsWriteEvent.type).to.equal(FSWriteEvent.type);
      expect(fsWriteEvent.target).to.equal(file1);
      expect(file1.read()).to.equal(content1);
      done();
    });
    file1.write(content1);
  });
});
