import { expect } from 'chai';
import puppeteer from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { FilePath } from '../src/js/FileSystem/FilePath.js';
import { DoesNotExistError, NotADirectoryError, NotAFileError } from '../src/js/Errors.js';
import { Host } from '../src/js/Host.js';

const puppeteerConfig = {
  args: [
    '--no-sandbox'
  ],
  headless: !process.argv.includes('--head')
};

// file tree is an object representing a file tree where keys are file or directory names, object
// values are directories, and string values are file contents
async function generateFileTree(root = new FilePath('/')) {
  return Object.fromEntries(await Promise.all(
    (await host.list(root))
      .map(async child => [
        child,
        await (
          await host.isDirectory(root.join(child)) ? generateFileTree(root.join(child))
          : host.readFile(root.join(child))
        )
      ])
  ));
}

async function createFiles(fileTree, root = new FilePath('/')) {
  await Promise.all(Object.entries(fileTree)
    .map(async ([filename, content]) => {
      const filepath = root.join(filename);

      if (typeof content == 'object') {
        await host.makeDirectory(filepath);
        await createFiles(content, filepath);
      } else {
        await host.writeFile(filepath, content);
      }
    })
  );
}

export function hostSpec(hostConstructor, {
  authenticate = async page => await page.evaluate(async () => await host.authenticate()),
  constructorArgs = [],
  pageUrl = 'about:blank'
} = {}) {
  let browser;
  let page;

  async function fileOperation(fileTree, operation = async () => {}) {
    const fileTreeBefore = await page.evaluate(async fileTree => {
      await createFiles(fileTree);
      return await generateFileTree();
    }, fileTree);

    expect(fileTreeBefore).to.deep.equal(fileTree);

    await page.evaluate(operation);

    return await page.evaluate(async () => await generateFileTree());
  }

  before(async function () {
    puppeteer.use(stealthPlugin());
    browser = await puppeteer.launch(puppeteerConfig);
    page = await browser.newPage();
    await page.goto(pageUrl, { waitUntil: 'networkidle2' });
    await page.evaluate(`
      ${FilePath}
      ${DoesNotExistError}
      ${NotADirectoryError}
      ${NotAFileError}
      ${Host}
      ${generateFileTree}
      ${createFiles}
    `);
    await page.evaluate(async (constructorStr, constructorArgs) => {
      window.SelfStorageHost = window.eval(`(${constructorStr})`);
      window.host = new SelfStorageHost(...constructorArgs);
    }, hostConstructor.toString(), constructorArgs);
    await authenticate(page);
  });

  afterEach(async function() {
    await page.evaluate(async () => await host.delete(new FilePath('/')));
  });

  describe('.name', function () {
    it('should be a string', async function () {
      const name = await page.evaluate(() => window.host.constructor.hostName);

      expect(name).to.be.a.string;
    });
  });

  describe('#copy', function () {
    it('should copy a file', async function () {
      const fileTree = {
        'copy_1_original': 'copy content 1'
      };
      const operation = async () => {
        await host.copy(new FilePath('/copy_1_original'), new FilePath('/copy_1_copy'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'copy_1_copy': 'copy content 1',
        'copy_1_original': 'copy content 1'
      });
    });

    it('should copy a directory', async function () {
      const fileTree = {
        'copy_2_original': {}
      };
      const operation = async () => {
        await host.copy(new FilePath('/copy_2_original'), new FilePath('/copy_2_copy'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'copy_2_copy': {},
        'copy_2_original': {}
      });
    });

    it('should copy a file within a directory', async function () {
      const fileTree = {
        'copy_3_dir': {
          'copy_3_original': 'copy content 3'
        }
      };
      const operation = async () => {
        await host.copy(new FilePath('/copy_3_dir/copy_3_original'), new FilePath('/copy_3_dir/copy_3_copy'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'copy_3_dir': {
          'copy_3_copy': 'copy content 3',
          'copy_3_original': 'copy content 3'
        }
      });
    });

    it('should copy a file to a different a directory', async function () {
      const fileTree = {
        'copy_4_original_dir': {
          'copy_4_original': 'copy content 4'
        }
      };
      const operation = async () => {
        await host.copy(new FilePath('/copy_4_original_dir/copy_4_original'), new FilePath('/copy_4_copy_dir/copy_4_copy'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'copy_4_copy_dir': {
          'copy_4_copy': 'copy content 4'
        },
        'copy_4_original_dir': {
          'copy_4_original': 'copy content 4'
        }
      });
    });

    it('should recursively copy a directory', async function () {
      const fileTree = {
        'copy_5_original_dir': {
          'copy_5_dir': {
            'copy_5_nested': 'copy content 5'
          },
          'copy_5_file': ''
        }
      };
      const operation = async () => {
        await host.copy(new FilePath('/copy_5_original_dir'), new FilePath('/copy_5_copy_dir'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'copy_5_copy_dir': {
          'copy_5_dir': {
            'copy_5_nested': 'copy content 5'
          },
          'copy_5_file': ''
        },
        'copy_5_original_dir': {
          'copy_5_dir': {
            'copy_5_nested': 'copy content 5'
          },
          'copy_5_file': ''
        }
      });
    });

    it('should throw an error if the source does not exist', async function () {
      const fileTree = {};
      const operation = async () => {
        try {
          await host.copy(new FilePath('/copy_6_original'), new FilePath('/copy_6_copy'));
          throw 'Did not throw an error';
        } catch (err) {
          if (!(err instanceof DoesNotExistError)) {
            throw err;
          }
        }
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({});
    });
  });

  describe('#delete', function () {
    it('should delete a file', async function () {
      const fileTree = {
        'delete_1': ''
      };
      const operation = async () => {
        await host.delete(new FilePath('/delete_1'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({});
    });

    it('should delete a directory', async function () {
      const fileTree = {
        'delete_1': {}
      };
      const operation = async () => {
        await host.delete(new FilePath('/delete_1'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({});
    });

    it('should delete a file within a directory', async function () {
      const fileTree = {
        'delete_3_dir': {
          'delete_3_file': ''
        }
      };
      const operation = async () => {
        await host.delete(new FilePath('/delete_3_dir/delete_3_file'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'delete_3_dir': {}
      });
    });

    it('should recursively delete a directory', async function () {
      const fileTree = {
        'delete_4_dir': {
          'delete_4_file': '',
          'delete_4_subdir': {
            'delete_4_subfile': ''
          }
        }
      };
      const operation = async () => {
        await host.delete(new FilePath('/delete_4_dir'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({});
    });

    it('should not throw an error deleting a nonexistent file', async function () {
      const fileTree = {};
      const operation = async () => {
        await host.delete(new FilePath('/delete_5'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({});
    });

    it('should not throw an error deleting a file within a nonexistent directory', async function () {
      const fileTree = {};
      const operation = async () => {
        await host.delete(new FilePath('/delete_6_dir1/delete_6_dir2/delete_6_file'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({});
    });
  });

  describe('#exists', function () {
    it('should return true if a file exists at the root', async function () {
      const fileTree = {
        'exists_1_file': ''
      };

      expect(await fileOperation(fileTree)).to.deep.equal(fileTree);
      expect(await page.evaluate(async () => await host.exists(new FilePath('/exists_1_file')))).to.be.true;
    });

    it('should return true if a directory exists at the root', async function () {
      const fileTree = {
        'exists_2_dir': {}
      };

      expect(await fileOperation(fileTree)).to.deep.equal(fileTree);
      expect(await page.evaluate(async () => await host.exists(new FilePath('/exists_2_dir')))).to.be.true;
    });

    it('should return true if a file exists in a directory', async function () {
      const fileTree = {
        'exists_3_dir': {
          'exists_3_file': ''
        }
      };

      expect(await fileOperation(fileTree)).to.deep.equal(fileTree);
      expect(await page.evaluate(async () => await host.exists(new FilePath('/exists_3_dir/exists_3_file')))).to.be.true;
    });

    it('should return false if a file does not exist at the root', async function () {
      const fileTree = {};

      expect(await fileOperation(fileTree)).to.deep.equal(fileTree);
      expect(await page.evaluate(async () => await host.exists(new FilePath('/exists_4_file')))).to.be.false;
    });

    it('should return false if a directory does not exist at the root', async function () {
      const fileTree = {};

      expect(await fileOperation(fileTree)).to.deep.equal(fileTree);
      expect(await page.evaluate(async () => await host.exists(new FilePath('/exists_5_dir')))).to.be.false;
    });

    it('should return false if a file does not exist in a directory', async function () {
      const fileTree = {
        'exists_6_dir': {}
      };

      expect(await fileOperation(fileTree)).to.deep.equal(fileTree);
      expect(await page.evaluate(async () => await host.exists(new FilePath('/exists_6_dir/exists_6_file')))).to.be.false;
    });

    it('should return false if a file does not exist in a nonexistent directory', async function () {
      const fileTree = {};

      expect(await fileOperation(fileTree)).to.deep.equal(fileTree);
      expect(await page.evaluate(async () => await host.exists(new FilePath('/exists_7_dir/exists_7_file')))).to.be.false;
    });

    it('should return true for the root directory', async function () {
      const fileTree = {};

      expect(await fileOperation(fileTree)).to.deep.equal(fileTree);
      expect(await page.evaluate(async () => await host.exists(new FilePath('/')))).to.be.true;
    });
  });

  describe('#isDirectory', function () {
    it('should be true for a directory', async function () {
      const fileTree = {
        'isDirectory_1_dir': {}
      };

      expect(await fileOperation(fileTree)).to.deep.equal(fileTree);
      expect(await page.evaluate(async () => await host.isDirectory(new FilePath('/isDirectory_1_dir')))).to.be.true;
    });

    it('should be false for a file', async function () {
      const fileTree = {
        'isDirectory_2_file': ''
      };

      expect(await fileOperation(fileTree)).to.deep.equal(fileTree);
      expect(await page.evaluate(async () => await host.isDirectory(new FilePath('/isDirectory_2_file')))).to.be.false;
    });

    it('should be true for the root directory', async function () {
      const fileTree = {};

      expect(await fileOperation(fileTree)).to.deep.equal(fileTree);
      expect(await page.evaluate(async () => await host.isDirectory(new FilePath('/')))).to.be.true;
    });
  });

  describe('#list', function () {
    it('should list files in sorted order', async function () {
      const fileTree = {
        'list_1_dir': {
          'abc': '',
          'file': 'text',
          'A': '',
          'Abd': ''
        }
      };

      expect(await fileOperation(fileTree)).to.deep.equal(fileTree);
      expect(await page.evaluate(async () => await host.list(new FilePath('/list_1_dir')))).to.deep.equal([
        'A',
        'Abd',
        'abc',
        'file'
      ]);
    });

    it('should list directories in sorted order', async function () {
      const fileTree = {
        'list_2_dir': {
          'dir2': {},
          'dir1': {}
        }
      };

      expect(await fileOperation(fileTree)).to.deep.equal(fileTree);
      expect(await page.evaluate(async () => await host.list(new FilePath('/list_2_dir')))).to.deep.equal([
        'dir1',
        'dir2'
      ]);
    });

    it('should list files and directories in sorted order', async function () {
      const fileTree = {
        'list_3_dir': {
          'abc': '',
          'file': 'text',
          'A': '',
          'dir2': {},
          'dir1': {},
          'Abd': ''
        }
      };

      expect(await fileOperation(fileTree)).to.deep.equal(fileTree);
      expect(await page.evaluate(async () => await host.list(new FilePath('/list_3_dir')))).to.deep.equal([
        'A',
        'Abd',
        'abc',
        'dir1',
        'dir2',
        'file'
      ]);
    });
  });

  describe('#makeDirectory', function () {
    it('should create an empty directory', async function () {
      const fileTree = {};
      const operation = async () => {
        await host.makeDirectory(new FilePath('/makeDirectory_1_dir'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'makeDirectory_1_dir': {}
      });
    });

    it('should create a directory in a directory', async function () {
      const fileTree = {
        'makeDirectory_2_dir': {
          'makeDirectory_2_otherFile': 'content'
        }
      };
      const operation = async () => {
        await host.makeDirectory(new FilePath('/makeDirectory_2_dir/makeDirectory_2_dir'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'makeDirectory_2_dir': {
          'makeDirectory_2_otherFile': 'content',
          'makeDirectory_2_dir': {}
        }
      });
    });

    it('should create parent directories if they do not exist', async function () {
      const fileTree = {};
      const operation = async () => {
        await host.makeDirectory(new FilePath('/makeDirectory_3_dir1/makeDirectory_3_dir2/makeDirectory_3_dir'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'makeDirectory_3_dir1': {
          'makeDirectory_3_dir2': {
            'makeDirectory_3_dir': {}
          }
        }
      });
    });

    it('should overwrite a file if it exists', async function () {
      const fileTree = {
        'makeDirectory_4': 'Existing file'
      };
      const operation = async () => {
        await host.makeDirectory(new FilePath('/makeDirectory_4'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'makeDirectory_4': {}
      });
    });

    it('should do nothing if the directory exists', async function () {
      const fileTree = {
        'makeDirectory_5': {
          'makeDirectory_5_file': 'test'
        }
      };
      const operation = async () => {
        await host.makeDirectory(new FilePath('/makeDirectory_5'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'makeDirectory_5': {
          'makeDirectory_5_file': 'test'
        }
      });
    });
  });

  describe('#makeFile', function () {
    it('should create an empty file', async function () {
      const fileTree = {};
      const operation = async () => {
        await host.makeFile(new FilePath('/makeFile_1_file'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'makeFile_1_file': ''
      });
    });

    it('should create a file in a directory', async function () {
      const fileTree = {
        'makeFile_2_dir': {
          'makeFile_2_otherFile': 'content'
        }
      };
      const operation = async () => {
        await host.makeFile(new FilePath('/makeFile_2_dir/makeFile_2_file'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'makeFile_2_dir': {
          'makeFile_2_otherFile': 'content',
          'makeFile_2_file': ''
        }
      });
    });

    it('should create parent directories if they do not exist', async function () {
      const fileTree = {};
      const operation = async () => {
        await host.makeFile(new FilePath('/makeFile_3_dir1/makeFile_3_dir2/makeFile_3_file'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'makeFile_3_dir1': {
          'makeFile_3_dir2': {
            'makeFile_3_file': ''
          }
        }
      });
    });

    it('should do nothing if a file exists', async function () {
      const fileTree = {
        'makeFile_4_file': 'Existing file'
      };
      const operation = async () => {
        await host.makeFile(new FilePath('/makeFile_4_file'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'makeFile_4_file': 'Existing file'
      });
    });

    it('should overwrite a directory if it exists', async function () {
      const fileTree = {
        'makeFile_5': {
          'makeFile_5_file': 'test'
        }
      };
      const operation = async () => {
        await host.makeFile(new FilePath('/makeFile_5'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'makeFile_5': ''
      });
    });
  });

  describe('#move', function () {
    it('should move a file', async function () {
      const fileTree = {
        'move_1_original': 'move content 1'
      };
      const operation = async () => {
        await host.move(new FilePath('/move_1_original'), new FilePath('/move_1_move'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'move_1_move': 'move content 1'
      });
    });

    it('should move a directory', async function () {
      const fileTree = {
        'move_2_original': {}
      };
      const operation = async () => {
        await host.move(new FilePath('/move_2_original'), new FilePath('/move_2_move'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'move_2_move': {},
      });
    });

    it('should move a file within a directory', async function () {
      const fileTree = {
        'move_3_dir': {
          'move_3_original': 'move content 3'
        }
      };
      const operation = async () => {
        await host.move(new FilePath('/move_3_dir/move_3_original'), new FilePath('/move_3_dir/move_3_move'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'move_3_dir': {
          'move_3_move': 'move content 3'
        }
      });
    });

    it('should move a file to a different a directory', async function () {
      const fileTree = {
        'move_4_original_dir': {
          'move_4_original': 'move content 4'
        }
      };
      const operation = async () => {
        await host.move(new FilePath('/move_4_original_dir/move_4_original'), new FilePath('/move_4_move_dir/move_4_move'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'move_4_move_dir': {
          'move_4_move': 'move content 4'
        },
        'move_4_original_dir': {}
      });
    });

    it('should recursively move a directory', async function () {
      const fileTree = {
        'move_5_original_dir': {
          'move_5_dir': {
            'move_5_nested': 'move content 5'
          },
          'move_5_file': ''
        }
      };
      const operation = async () => {
        await host.move(new FilePath('/move_5_original_dir'), new FilePath('/move_5_move_dir'));
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'move_5_move_dir': {
          'move_5_dir': {
            'move_5_nested': 'move content 5'
          },
          'move_5_file': ''
        }
      });
    });

    it('should throw an error if the source does not exist', async function () {
      const fileTree = {};
      const operation = async () => {
        try {
          await host.move(new FilePath('/move_6_original'), new FilePath('/move_6_move'));
          throw 'Did not throw an error';
        } catch (err) {
          if (!(err instanceof DoesNotExistError)) {
            throw err;
          }
        }
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({});
    });
  });

  describe('#readFile', function () {
    it('should read a file at the root', async function () {
      const fileTree = {
        'readFile_1_file': 'read content 1'
      };

      expect(await fileOperation(fileTree)).to.deep.equal(fileTree);
      expect(await page.evaluate(async () => await host.readFile(new FilePath('/readFile_1_file')))).to.equal(
        'read content 1'
      );
    });

    it('should read a file in a directory', async function () {
      const fileTree = {
        'readFile_2_dir': {
          'readFile_2_file': 'read content 2'
        }
      };

      expect(await fileOperation(fileTree)).to.deep.equal(fileTree);
      expect(await page.evaluate(async () => await host.readFile(new FilePath('/readFile_2_dir/readFile_2_file')))).to.equal(
        'read content 2'
      );
    });

    it('should throw an error if the file does not exist', async function () {
      const fileTree = {};
      const operation = async () => {
        try {
          await host.readFile(new FilePath('/readFile_3_file'));
          throw 'Did not throw an error';
        } catch (err) {
          if (!(err instanceof DoesNotExistError)) {
            throw err;
          }
        }
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({});
    });

    it('should throw an error if the path is a directory', async function () {
      const fileTree = {
        'readFile_4_dir': {}
      };
      const operation = async () => {
        try {
          await host.readFile(new FilePath('/readFile_4_dir'));
          throw 'Did not throw an error';
        } catch (err) {
          if (!(err instanceof NotAFileError)) {
            throw err;
          }
        }
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'readFile_4_dir': {}
      });
    });
  });

  describe('#writeFile', function () {
    it('should write to a file', async function () {
      const fileTree = {};
      const operation = async () => {
        await host.writeFile(new FilePath('/writeFile_1_file'), 'writeFile content 1');
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'writeFile_1_file': 'writeFile content 1'
      });
    });

    it('should write to a file in a directory', async function () {
      const fileTree = {
        'writeFile_2_dir': {
          'writeFile_2_otherFile': 'content'
        }
      };
      const operation = async () => {
        await host.writeFile(new FilePath('/writeFile_2_dir/writeFile_2_file'), 'writeFile content 2');
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'writeFile_2_dir': {
          'writeFile_2_otherFile': 'content',
          'writeFile_2_file': 'writeFile content 2'
        }
      });
    });

    it('should create parent directories if they do not exist', async function () {
      const fileTree = {};
      const operation = async () => {
        await host.writeFile(new FilePath('/writeFile_3_dir1/writeFile_3_dir2/writeFile_3_file'), 'writeFile content 3');
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'writeFile_3_dir1': {
          'writeFile_3_dir2': {
            'writeFile_3_file': 'writeFile content 3'
          }
        }
      });
    });

    it('should overwrite an existing file', async function () {
      const fileTree = {
        'writeFile_4_file': 'Existing file'
      };
      const operation = async () => {
        await host.writeFile(new FilePath('/writeFile_4_file'), 'writeFile content 4');
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'writeFile_4_file': 'writeFile content 4'
      });
    });

    it('should overwrite a directory if it exists', async function () {
      const fileTree = {
        'writeFile_5': {
          'writeFile_5_file': 'test'
        }
      };
      const operation = async () => {
        await host.writeFile(new FilePath('/writeFile_5'), 'writeFile content 5');
      };

      expect(await fileOperation(fileTree, operation)).to.deep.equal({
        'writeFile_5': 'writeFile content 5'
      });
    });
  });

  after(async function () {
    await browser.close();
  });
}
