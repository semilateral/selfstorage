import { expect } from 'chai';
import { Directory } from '../../src/js/FileSystem/Directory.js';
import { File } from '../../src/js/FileSystem/File.js';

describe('Directory', function () {
  this.timeout(2000);

  it('should list files in the directory', function () {
    const name1 = 'file1';
    const name2 = 'file2';
    const name3 = 'file3';
    const dir1 = new Directory('directory');
    const file1 = new File(name1, dir1);
    const file2 = new File(name2, dir1);
    const file3 = new File(name3);

    let listedFiles = dir1.list();

    expect(listedFiles.length).to.equal(2);
    expect(listedFiles.includes(name1) && listedFiles.includes(name2)).to.be.true;
    expect(listedFiles.includes(name3)).to.be.false;

    file3.moveTo(dir1);
    listedFiles = dir1.list();

    expect(listedFiles.length).to.equal(3);
    expect(listedFiles.includes(name3)).to.be.true;

    file2.remove();
    listedFiles = dir1.list();

    expect(listedFiles.length).to.equal(2);
    expect(listedFiles.includes(name2)).to.be.false;
  });
});
