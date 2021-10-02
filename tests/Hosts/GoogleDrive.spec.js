import { GoogleDrive } from '../../src/js/Hosts/GoogleDrive.js';
import googleDriveCredentials from '../../tests/testcredentials/GoogleDrive.json';
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
      'http://lvh.me:8080/demo/'
    ]
  });
});
