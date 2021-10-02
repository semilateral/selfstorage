import { expect } from 'chai';
import { FilePath } from '../../src/js/FileSystem/FilePath.js';

describe('FilePath', function () {
  this.timeout(2000);

  it('should parse a simple absolute path', function () {
    const fp1 = new FilePath('/test/path');

    expect(fp1 == '/test/path').to.be.true;
    expect(fp1.isAbsolute).to.be.true;
  });

  it('should parse a simple relative path', function () {
    const fp1 = new FilePath('test/path');

    expect(fp1 == 'test/path').to.be.true;
    expect(fp1.isAbsolute).to.be.false;
  });

  it('should get the basename of a path', function () {
    const fp1 = new FilePath('test/path/abc');

    expect(fp1.basename).to.equal('abc');
  });

  it('should evaluate the basename of a path with no separators to be the full path', function () {
    const fp1 = new FilePath('test');

    expect(fp1.basename).to.equal('test');
  });

  it('should evaluate the basename of an empty path to be an empty string', function () {
    const fp1 = new FilePath('');

    expect(fp1.basename).to.equal('');
  });

  it('should evaluate the basename of the root path to be the root directory', function () {
    const fp1 = new FilePath('/');

    expect(fp1.basename).to.equal('/');
  });

  it('should get the dirname of a relative path', function () {
    const fp1 = new FilePath('test/path/abc');

    expect(fp1.dirname).to.equal('test/path');
  });

  it('should get the dirname of an absolute path', function () {
    const fp1 = new FilePath('/test/path/abc');

    expect(fp1.dirname).to.equal('/test/path');
  });

  it('should evaluate the dirname of a path with no separators to be the current directory', function () {
    const fp1 = new FilePath('test');

    expect(fp1.dirname).to.equal('.');
  });

  it('should evaluate the dirname of a path with only the root separator to be the root', function () {
    const fp1 = new FilePath('/test');

    expect(fp1.dirname).to.equal('/');
  });

  it('should evaluate the dirname of an empty path to be the current directory', function () {
    const fp1 = new FilePath('');

    expect(fp1.dirname).to.equal('.');
  });

  it('should evaluate the dirname of the root path to be the root directory', function () {
    const fp1 = new FilePath('/');

    expect(fp1.dirname).to.equal('/');
  });

  it('should ignore repeated and trailing separators', function () {
    const fp1 = new FilePath('//test/path///abc/');

    expect(fp1 == '/test/path/abc').to.be.true;
    expect(fp1.isAbsolute).to.be.true;
  });

  it('should evaluate current directory references', function () {
    const fp1 = new FilePath('./test/path/././abc/.');

    expect(fp1 == 'test/path/abc').to.be.true;
    expect(fp1.isAbsolute).to.be.false;
  });

  it('should evaluate parent directory references', function () {
    const fp1 = new FilePath('/test/path/../other/abc/../../def/ghi/..');

    expect(fp1 == '/test/def').to.be.true;
    expect(fp1.isAbsolute).to.be.true;
  });

  it('should evaluate parent directory references that go above the root', function () {
    const fp1 = new FilePath('/test/../../../path/abc/../def');

    expect(fp1 == '/path/def').to.be.true;
    expect(fp1.isAbsolute).to.be.true;
  });

  it('should keep parent references that go outside the relative directory', function () {
    const fp1 = new FilePath('test/../../../path/abc/../def');

    expect(fp1 == '../../path/def').to.be.true;
    expect(fp1.isAbsolute).to.be.false;
  });

  // TODO: Add tests for FilePath#equals
});
