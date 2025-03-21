import { EventEmitter } from "events";
import { Logger } from "../utils/logger";
import fs from "fs";
import path from "path";

/**
 * Interface for plugin metadata
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  main: string;
  hooks: string[];
}

/**
 * Interface for a plugin instance
 */
export interface Plugin {
  metadata: PluginMetadata;
  instance: any;
}

/**
 * Available hook points in the application
 */
export enum HookPoint {
  PRE_FETCH = "preFetch",
  POST_FETCH = "postFetch",
  PRE_PROCESS = "preProcess",
  POST_PROCESS = "postProcess",
  PRE_GENERATE = "preGenerate",
  POST_GENERATE = "postGenerate",
  FILTER_FILE = "filterFile",
  TRANSFORM_CONTENT = "transformContent",
  CUSTOM_FETCHER = "customFetcher",
  CUSTOM_PROCESSOR = "customProcessor",
  CUSTOM_GENERATOR = "customGenerator",
}

/**
 * Plugin Manager responsible for loading, registering and executing plugins
 */
export class PluginManager extends EventEmitter {
  private plugins: Map<string, Plugin> = new Map();
  private logger: Logger;
  private pluginDirectories: string[] = [];

  constructor(logger: Logger) {
    super();
    this.logger = logger;

    // Default plugin directories
    this.pluginDirectories = [
      // Global plugins
      path.join(process.cwd(), "node_modules"),
      // Local plugins
      path.join(process.cwd(), "plugins"),
    ];

    // Add custom plugin directory from environment if available
    const customPluginDir = process.env.REPO2PDF_PLUGIN_DIR;
    if (customPluginDir && fs.existsSync(customPluginDir)) {
      this.pluginDirectories.push(customPluginDir);
    }
  }

  /**
   * Add a custom plugin directory
   */
  public addPluginDirectory(directory: string): void {
    if (fs.existsSync(directory)) {
      this.pluginDirectories.push(directory);
      this.logger.info(`Added plugin directory: ${directory}`);
    } else {
      this.logger.warn(`Plugin directory does not exist: ${directory}`);
    }
  }

  /**
   * Load all plugins from the configured directories
   */
  public async loadPlugins(): Promise<void> {
    this.logger.info("Loading plugins...");

    for (const directory of this.pluginDirectories) {
      await this.loadPluginsFromDirectory(directory);
    }

    this.logger.info(`Loaded ${this.plugins.size} plugins`);
  }

  /**
   * Load plugins from a specific directory
   */
  private async loadPluginsFromDirectory(directory: string): Promise<void> {
    try {
      // Look for plugins in the directory
      const files = fs.readdirSync(directory);

      for (const file of files) {
        // Check if it's a directory and starts with repo2pdf-plugin-
        if (
          fs.statSync(path.join(directory, file)).isDirectory() &&
          (file.startsWith("repo2pdf-plugin-") || directory.endsWith("plugins"))
        ) {
          await this.loadPlugin(path.join(directory, file));
        }
      }
    } catch (error) {
      this.logger.error(
        `Error loading plugins from directory ${directory}:`,
        error,
      );
    }
  }

  /**
   * Load a single plugin from a directory
   */
  private async loadPlugin(pluginPath: string): Promise<void> {
    try {
      // Check for package.json
      const packageJsonPath = path.join(pluginPath, "package.json");
      if (!fs.existsSync(packageJsonPath)) {
        this.logger.warn(
          `No package.json found in plugin directory: ${pluginPath}`,
        );
        return;
      }

      // Read and parse package.json
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      // Validate plugin metadata
      if (!this.validatePluginMetadata(packageJson, pluginPath)) {
        return;
      }

      // Load the plugin
      const pluginMain = path.join(pluginPath, packageJson.main);
      const pluginModule = await import(pluginMain);

      // Register the plugin
      this.registerPlugin({
        metadata: {
          name: packageJson.name,
          version: packageJson.version,
          description: packageJson.description,
          author: packageJson.author,
          main: packageJson.main,
          hooks: packageJson.repo2pdfHooks || [],
        },
        instance: pluginModule.default || pluginModule,
      });

      this.logger.info(
        `Loaded plugin: ${packageJson.name} v${packageJson.version}`,
      );
    } catch (error) {
      this.logger.error(`Error loading plugin from ${pluginPath}:`, error);
    }
  }

  /**
   * Validate plugin metadata
   */
  private validatePluginMetadata(
    packageJson: any,
    pluginPath: string,
  ): boolean {
    // Check required fields
    if (!packageJson.name || !packageJson.version || !packageJson.main) {
      this.logger.warn(
        `Invalid plugin metadata in ${pluginPath}: missing required fields`,
      );
      return false;
    }

    // Check if main file exists
    const mainPath = path.join(pluginPath, packageJson.main);
    if (!fs.existsSync(mainPath)) {
      this.logger.warn(`Invalid plugin: main file not found at ${mainPath}`);
      return false;
    }

    return true;
  }

  /**
   * Register a plugin
   */
  public registerPlugin(plugin: Plugin): void {
    if (this.plugins.has(plugin.metadata.name)) {
      this.logger.warn(`Plugin ${plugin.metadata.name} is already registered`);
      return;
    }

    this.plugins.set(plugin.metadata.name, plugin);
    this.logger.debug(`Registered plugin: ${plugin.metadata.name}`);
  }

  /**
   * Execute a hook with the given arguments
   */
  public async executeHook(hook: HookPoint, ...args: any[]): Promise<any> {
    this.logger.debug(`Executing hook: ${hook}`);

    let result = args[0]; // Start with the initial value

    for (const [name, plugin] of this.plugins.entries()) {
      if (
        plugin.metadata.hooks.includes(hook) &&
        typeof plugin.instance[hook] === "function"
      ) {
        try {
          this.logger.debug(`Executing ${hook} in plugin ${name}`);
          // Pass the current result as the first argument, followed by any other args
          const hookResult = await plugin.instance[hook](
            result,
            ...args.slice(1),
          );

          // Update the result if the hook returned something
          if (hookResult !== undefined) {
            result = hookResult;
          }
        } catch (error) {
          this.logger.error(
            `Error executing hook ${hook} in plugin ${name}:`,
            error,
          );
        }
      }
    }

    return result;
  }

  /**
   * Get all registered plugins
   */
  public getPlugins(): Map<string, Plugin> {
    return this.plugins;
  }

  /**
   * Get a specific plugin by name
   */
  public getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Unregister a plugin
   */
  public unregisterPlugin(name: string): boolean {
    return this.plugins.delete(name);
  }
}
