import { SelfStorage } from '../SelfStorage.js';
import { GoogleDrive } from '../Hosts/GoogleDrive.js';
import googleDriveCredentials from '../../../tests/testconfig/GoogleDrive.json';

const filenameInput = document.getElementById('filename');
const fileContentInput = document.getElementById('filecontent');
const readFileButton = document.getElementById('readfile');
const writeFileButton = document.getElementById('writefile');
const deleteFileButton = document.getElementById('deletefile');

const fileHost = new GoogleDrive(
  googleDriveCredentials.clientId,
  'https://semilateral.github.io/selfstorage/google-authenticated.html',
  {
    uploadChunkSize: 262144
  }
);
const ss = new SelfStorage(fileHost);

function setInputsEnabled(enabled) {
  for (const el of [filenameInput, fileContentInput, readFileButton, writeFileButton, deleteFileButton]) {
    el.disabled = !enabled;
  }
}

async function run(action, handleError = err => {}) {
  setInputsEnabled(false);

  try {
    await action();
  } catch (err) {
    handleError(err);
    setInputsEnabled(true);
    throw err;
  }

  setInputsEnabled(true);
}

readFileButton.addEventListener('click', () => run(
  async () => fileContentInput.value = await ss.readFile(filenameInput.value),
  () => fileContentInput.value = ''
));

writeFileButton.addEventListener('click', () => run(
  async () => await ss.writeFile(filenameInput.value, fileContentInput.value)
));

deleteFileButton.addEventListener('click', () => run(
  async () => await ss.delete(filenameInput.value)
));

window.fileHost = fileHost;
setTimeout(() => fileHost.authenticate(), 2000);
