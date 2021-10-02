export class SelfStorage {
  constructor(host) {
    this.host = host;
  }

  async delete(path) {
    return await this.host.delete(path);
  }

  async readFile(path) {
    return await this.host.readFile(path);
  }

  async writeFile(path, content) {
    return await this.host.writeFile(path, content);
  }
}
