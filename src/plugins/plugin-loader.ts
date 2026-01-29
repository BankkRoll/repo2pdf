/**
 * Plugin Loader for repo2pdf
 * @module plugins/plugin-loader
 *
 * @description
 * The PluginLoader provides a high-level facade for initializing and configuring
 * the plugin system. It wraps the PluginManager with a simpler initialization API.
 *
 * @example
 * ```typescript
 * import { PluginLoader } from 'repo2pdf';
 *
 * const loader = new PluginLoader(logger);
 * const pluginManager = await loader.initialize({
 *   pluginDirectories: ['/custom/plugins'],
 *   disabledPlugins: ['repo2pdf-plugin-unwanted']
 * });
 *
 * // Now use pluginManager to execute hooks
 * ```
 */

import { Logger } from "../utils/logger";
import { PluginManager } from "./plugin-manager";

/**
 * Options for initializing the plugin system.
 */
export interface PluginLoaderOptions {
  /**
   * Additional directories to search for plugins.
   * Plugins in these directories don't need the `repo2pdf-plugin-` prefix.
   */
  pluginDirectories?: string[];

  /**
   * Array of plugin names to disable after loading.
   * Use the full package name (e.g., "repo2pdf-plugin-syntax-highlighter").
   */
  disabledPlugins?: string[];
}

/**
 * Plugin Loader class for initializing the plugin system.
 *
 * @description
 * The PluginLoader is the recommended entry point for setting up plugins.
 * It handles the complete initialization sequence:
 *
 * 1. Creates a PluginManager instance
 * 2. Adds any custom plugin directories
 * 3. Loads all discovered plugins
 * 4. Disables any specified plugins
 *
 * @remarks
 * For most use cases, you only need to call `initialize()` once at startup.
 * The returned PluginManager can then be used throughout your application.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const loader = new PluginLoader(logger);
 * const manager = await loader.initialize();
 *
 * // With options
 * const manager = await loader.initialize({
 *   pluginDirectories: ['/path/to/custom/plugins'],
 *   disabledPlugins: ['repo2pdf-plugin-theme-customizer']
 * });
 *
 * // Use the manager
 * const config = await manager.executeHook(HookPoint.PRE_FETCH, initialConfig);
 * ```
 */
export class PluginLoader {
  /** The underlying plugin manager instance */
  private pluginManager: PluginManager;

  /** Logger for output */
  private logger: Logger;

  /**
   * Creates a new PluginLoader instance.
   *
   * @param logger - Logger instance for debug and error output
   *
   * @example
   * ```typescript
   * const loader = new PluginLoader(new Logger());
   * ```
   */
  constructor(logger: Logger) {
    this.logger = logger;
    this.pluginManager = new PluginManager(logger);
  }

  /**
   * Initialize the plugin system.
   *
   * @description
   * Performs the complete plugin initialization sequence:
   * 1. Adds custom plugin directories (if provided)
   * 2. Loads all plugins from all configured directories
   * 3. Disables specified plugins (if any)
   *
   * @param options - Optional configuration for plugin loading
   * @returns The initialized PluginManager ready for use
   *
   * @remarks
   * This method is idempotent for plugin loading - calling it multiple times
   * won't load the same plugins twice. However, it will re-process the
   * `disabledPlugins` list each time.
   *
   * @example
   * ```typescript
   * // Initialize with defaults
   * const manager = await loader.initialize();
   *
   * // Initialize with custom directories
   * const manager = await loader.initialize({
   *   pluginDirectories: [
   *     '/home/user/my-plugins',
   *     '/shared/team-plugins'
   *   ]
   * });
   *
   * // Initialize and disable specific plugins
   * const manager = await loader.initialize({
   *   disabledPlugins: [
   *     'repo2pdf-plugin-syntax-highlighter',
   *     'repo2pdf-plugin-theme-customizer'
   *   ]
   * });
   * ```
   */
  public async initialize(
    options: PluginLoaderOptions = {},
  ): Promise<PluginManager> {
    this.logger.info("Initializing plugin system...");

    // Add custom plugin directories if provided
    if (options.pluginDirectories) {
      for (const dir of options.pluginDirectories) {
        this.pluginManager.addPluginDirectory(dir);
      }
    }

    // Load all plugins from all directories
    await this.pluginManager.loadPlugins();

    // Disable specified plugins
    if (options.disabledPlugins) {
      for (const pluginName of options.disabledPlugins) {
        if (this.pluginManager.unregisterPlugin(pluginName)) {
          this.logger.info(`Disabled plugin: ${pluginName}`);
        } else {
          this.logger.warn(`Plugin not found to disable: ${pluginName}`);
        }
      }
    }

    const pluginCount = this.pluginManager.getPlugins().size;
    this.logger.info(`Plugin system initialized with ${pluginCount} plugin(s)`);

    return this.pluginManager;
  }

  /**
   * Get the plugin manager instance.
   *
   * @returns The PluginManager instance
   *
   * @remarks
   * This method can be called before `initialize()`, but the manager
   * won't have any plugins loaded until initialization completes.
   *
   * @example
   * ```typescript
   * const manager = loader.getPluginManager();
   * console.log(`Registered plugins: ${manager.getPlugins().size}`);
   * ```
   */
  public getPluginManager(): PluginManager {
    return this.pluginManager;
  }
}
