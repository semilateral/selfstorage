import { Host } from '../Host.js';

export class Pastebin extends Host {
  static get name() {
    return 'Pastebin';
  }

  constructor(apiKey) {
    super();

    this.apiKey = apiKey;
  }

  async deleteFile(filename) {
    // TODO
  }

  async readFile(filename) {
    // TODO
  }

  async writeFile(filename, content) {
    const data = new FormData();

    data.append('api_option', 'paste');
    data.append('api_dev_key', this.apiKey);
    data.append('api_paste_code', content);
    data.append('api_paste_name', filename);
    data.append('api_paste_private', 1);
    data.append('api_paste_expire_date', 'N');

    await fetch('https://pastebin.com/api/api_post.php', { body: data, method: 'POST' });
  }
}
