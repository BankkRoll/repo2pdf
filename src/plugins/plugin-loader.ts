import { Logger } from "../utils/logger";
import { PluginManager } from "./plugin-manager";

/**
 * Plugin Loader class
 * Responsible for initializing and configuring the plugin system
 */
export class PluginLoader {
  private pluginManager: PluginManager;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.pluginManager = new PluginManager(logger);
  }

  /**
   * Initialize the plugin system
   */
  public async initialize(
    options: {
      pluginDirectories?: string[];
      disabledPlugins?: string[];
    } = {},
  ): Promise<PluginManager> {
    this.logger.info("Initializing plugin system...");

    // Add custom plugin directories if provided
    if (options.pluginDirectories) {
      for (const dir of options.pluginDirectories) {
        this.pluginManager.addPluginDirectory(dir);
      }
    }

    // Load all plugins
    await this.pluginManager.loadPlugins();

    // Disable plugins if specified
    if (options.disabledPlugins) {
      for (const pluginName of options.disabledPlugins) {
        this.pluginManager.unregisterPlugin(pluginName);
        this.logger.info(`Disabled plugin: ${pluginName}`);
      }
    }

    return this.pluginManager;
  }

  /**
   * Get the plugin manager instance
   */
  public getPluginManager(): PluginManager {
    return this.pluginManager;
  }
}
