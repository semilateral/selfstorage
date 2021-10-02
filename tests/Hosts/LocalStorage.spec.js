import { LocalStorage } from '../../src/js/Hosts/LocalStorage.js';
import { hostSpec } from '../HostTests.js';

describe('LocalStorage', function () {
  this.timeout(30000);

  hostSpec(LocalStorage, {
    pageUrl: 'https://example.com'
  });
});
