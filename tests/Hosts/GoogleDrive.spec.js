import { GoogleDrive } from '../../src/js/Hosts/GoogleDrive.js';
import googleDriveCredentials from '../../tests/testconfig/GoogleDrive.json';
import { hostSpec } from '../HostTests.js';

describe('GoogleDrive', function () {
  this.timeout(120000);

  hostSpec(GoogleDrive, {
    authenticate: async page => {
      await page.evaluate(async () => {
        await host.authenticate();
      });
    },
    constructorArgs: [
      googleDriveCredentials.clientId,
      'https://semilateral.github.io/selfstorage/testpage.html'
    ]
  });
});
