// configManager.ts

export class ConfigManager {
  private config: any;

  setConfig(config: any): void {
    this.config = config;
  }

  getConfig(): any {
    return this.config;
  }

  hasConfigChanged(newConfig: any): boolean {
    return JSON.stringify(this.config) !== JSON.stringify(newConfig);
  }
}

