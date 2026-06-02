/**
 * Plugin Manager for repo2pdf
 * @module plugins/plugin-manager
 *
 * @description
 * The PluginManager is responsible for discovering, loading, registering,
 * and executing plugins throughout the repo2pdf pipeline. It provides a
 * hook-based architecture that allows plugins to intercept and modify
 * data at various stages of processing.
 *
 * @example
 * ```typescript
 * import { PluginManager, HookPoint } from 'repo2pdf';
 *
 * const manager = new PluginManager(logger);
 * await manager.loadPlugins();
 *
 * // Execute a hook
 * const modifiedConfig = await manager.executeHook(HookPoint.PRE_FETCH, config);
 * ```
 */

import { EventEmitter } from "events";
import { Logger } from "../utils/logger";
import fs from "fs";
import path from "path";

/**
 * Metadata describing a plugin's identity and capabilities.
 *
 * @remarks
 * This information is typically read from the plugin's package.json file.
 * The `hooks` array determines which hook points the plugin will be called for.
 */
export interface PluginMetadata {
  /** Unique plugin identifier (npm package name) */
  name: string;
  /** Semantic version string (e.g., "1.0.0") */
  version: string;
  /** Human-readable description of what the plugin does */
  description: string;
  /** Plugin author name or organization */
  author: string;
  /** Entry point file relative to plugin root (e.g., "index.js") */
  main: string;
  /** Array of hook names this plugin implements (e.g., ["transformContent", "filterFile"]) */
  hooks: string[];
}

/**
 * A loaded and registered plugin instance.
 *
 * @remarks
 * Contains both the plugin's metadata and its actual implementation.
 * The instance is the default export from the plugin's main file.
 */
export interface Plugin {
  /** Plugin metadata from package.json */
  metadata: PluginMetadata;
  /** The plugin implementation (default export from main file) */
  instance: any;
}

/**
 * Available hook points in the repo2pdf pipeline.
 *
 * @description
 * Hook points represent stages in the PDF generation pipeline where
 * plugins can intercept and modify data. Hooks are divided into three categories:
 *
 * **Lifecycle Hooks** - Called at specific pipeline stages:
 * - `PRE_FETCH` / `POST_FETCH` - Before/after repository fetching
 * - `PRE_PROCESS` / `POST_PROCESS` - Before/after file processing
 * - `PRE_GENERATE` / `POST_GENERATE` - Before/after PDF generation
 *
 * **Filter/Transform Hooks** - Called for each file:
 * - `FILTER_FILE` - Determine if a file should be included
 * - `TRANSFORM_CONTENT` - Modify file content
 *
 * **Custom Handler Hooks** - Replace entire pipeline stages:
 * - `CUSTOM_FETCHER` - Replace repository fetching
 * - `CUSTOM_PROCESSOR` - Replace file processing
 * - `CUSTOM_GENERATOR` - Replace PDF generation
 *
 * @example
 * ```typescript
 * // In a plugin
 * [HookPoint.TRANSFORM_CONTENT] = (content: string, file: RepoFile) => {
 *   return content.toUpperCase();
 * };
 * ```
 */
export enum HookPoint {
  /** Called before fetching repository content */
  PRE_FETCH = "preFetch",
  /** Called after fetching repository content */
  POST_FETCH = "postFetch",
  /** Called before processing files */
  PRE_PROCESS = "preProcess",
  /** Called after processing files */
  POST_PROCESS = "postProcess",
  /** Called before generating output */
  PRE_GENERATE = "preGenerate",
  /** Called after generating output */
  POST_GENERATE = "postGenerate",
  /** Called for each file to determine inclusion */
  FILTER_FILE = "filterFile",
  /** Called for each file to transform content */
  TRANSFORM_CONTENT = "transformContent",
  /** Replaces the default repository fetcher */
  CUSTOM_FETCHER = "customFetcher",
  /** Replaces the default file processor */
  CUSTOM_PROCESSOR = "customProcessor",
  /** Replaces the default output generator */
  CUSTOM_GENERATOR = "customGenerator",
}

/**
 * Options for initializing the PluginManager.
 */
export interface PluginManagerOptions {
  /** Additional directories to search for plugins */
  pluginDirectories?: string[];
  /** Plugin names to exclude from loading */
  disabledPlugins?: string[];
}

/**
 * Plugin Manager responsible for loading, registering, and executing plugins.
 *
 * @description
 * The PluginManager extends EventEmitter and manages the complete plugin lifecycle:
 *
 * 1. **Discovery** - Scans configured directories for plugins
 * 2. **Loading** - Reads package.json and imports plugin modules
 * 3. **Registration** - Stores plugins in an internal registry
 * 4. **Execution** - Runs hooks sequentially with data chaining
 *
 * @remarks
 * Plugins are discovered in these locations (in order):
 * - `node_modules/repo2pdf-plugin-*` (npm-installed plugins)
 * - `./plugins/*` (local plugins directory)
 * - `$REPO2PDF_PLUGIN_DIR/*` (custom directory via environment variable)
 *
 * @example
 * ```typescript
 * const logger = new Logger();
 * const manager = new PluginManager(logger);
 *
 * // Add custom plugin directory
 * manager.addPluginDirectory('/path/to/my/plugins');
 *
 * // Load all discovered plugins
 * await manager.loadPlugins();
 *
 * // Execute hooks during pipeline
 * const config = await manager.executeHook(HookPoint.PRE_FETCH, initialConfig);
 * const files = await manager.executeHook(HookPoint.POST_FETCH, fetchedFiles, config);
 * ```
 *
 * @fires PluginManager#pluginLoaded - When a plugin is successfully loaded
 * @fires PluginManager#hookExecuted - When a hook completes execution
 */
export class PluginManager extends EventEmitter {
  /** Map of registered plugins by name */
  private plugins: Map<string, Plugin> = new Map();

  /** Logger instance for debug and error output */
  private logger: Logger;

  /** Directories to search for plugins */
  private pluginDirectories: string[] = [];

  /**
   * Creates a new PluginManager instance.
   *
   * @param logger - Logger instance for output
   *
   * @example
   * ```typescript
   * const manager = new PluginManager(new Logger());
   * ```
   */
  constructor(logger: Logger) {
    super();
    this.logger = logger;

    // Default plugin directories
    this.pluginDirectories = [
      // Global plugins (npm packages)
      path.join(process.cwd(), "node_modules"),
      // Local plugins directory
      path.join(process.cwd(), "plugins"),
    ];

    // Add custom plugin directory from environment variable
    const customPluginDir = process.env.REPO2PDF_PLUGIN_DIR;
    if (customPluginDir && fs.existsSync(customPluginDir)) {
      this.pluginDirectories.push(customPluginDir);
    }
  }

  /**
   * Add a custom plugin directory to search.
   *
   * @param directory - Absolute path to the plugin directory
   *
   * @remarks
   * The directory must exist on the filesystem.
   * Plugins in custom directories don't need the `repo2pdf-plugin-` prefix.
   *
   * @example
   * ```typescript
   * manager.addPluginDirectory('/home/user/my-plugins');
   * ```
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
   * Load all plugins from configured directories.
   *
   * @description
   * Scans all plugin directories and loads valid plugins.
   * Invalid plugins are logged but don't prevent other plugins from loading.
   *
   * @remarks
   * This method should be called once during initialization.
   * Calling it multiple times will skip already-registered plugins.
   *
   * @example
   * ```typescript
   * await manager.loadPlugins();
   * console.log(`Loaded ${manager.getPlugins().size} plugins`);
   * ```
   */
  public async loadPlugins(): Promise<void> {
    this.logger.info("Loading plugins...");

    for (const directory of this.pluginDirectories) {
      await this.loadPluginsFromDirectory(directory);
    }

    this.logger.info(`Loaded ${this.plugins.size} plugins`);
  }

  /**
   * Load plugins from a specific directory.
   *
   * @param directory - Directory path to scan for plugins
   *
   * @internal
   */
  private async loadPluginsFromDirectory(directory: string): Promise<void> {
    try {
      if (!fs.existsSync(directory)) {
        return;
      }

      const entries = fs.readdirSync(directory);

      for (const entry of entries) {
        const entryPath = path.join(directory, entry);
        const stat = fs.statSync(entryPath);

        // Check if it's a directory and matches plugin naming convention
        if (
          stat.isDirectory() &&
          (entry.startsWith("repo2pdf-plugin-") ||
            directory.endsWith("plugins"))
        ) {
          await this.loadPlugin(entryPath);
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
   * Load a single plugin from a directory.
   *
   * @param pluginPath - Path to the plugin directory
   *
   * @internal
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

      // Load the plugin module, guarding against a `main` that escapes the
      // plugin directory via path traversal.
      const mainPath = path.resolve(pluginPath, packageJson.main);
      if (!mainPath.startsWith(path.resolve(pluginPath) + path.sep)) {
        this.logger.warn(`Plugin main escapes plugin dir: ${pluginPath}`);
        return;
      }
      const pluginModule = await import(mainPath);

      // Register the plugin
      this.registerPlugin({
        metadata: {
          name: packageJson.name,
          version: packageJson.version,
          description: packageJson.description || "",
          author: packageJson.author || "",
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
   * Validate plugin metadata from package.json.
   *
   * @param packageJson - Parsed package.json content
   * @param pluginPath - Path to the plugin (for error messages)
   * @returns `true` if valid, `false` otherwise
   *
   * @internal
   */
  private validatePluginMetadata(
    packageJson: Record<string, unknown>,
    pluginPath: string,
  ): boolean {
    // Check required fields
    if (!packageJson.name || !packageJson.version || !packageJson.main) {
      this.logger.warn(
        `Invalid plugin metadata in ${pluginPath}: missing required fields (name, version, main)`,
      );
      return false;
    }

    // Check if main file exists
    const mainPath = path.join(pluginPath, packageJson.main as string);
    if (!fs.existsSync(mainPath)) {
      this.logger.warn(`Invalid plugin: main file not found at ${mainPath}`);
      return false;
    }

    return true;
  }

  /**
   * Register a plugin instance.
   *
   * @param plugin - Plugin to register
   *
   * @remarks
   * Plugins with duplicate names are skipped with a warning.
   * Use `unregisterPlugin` first if you need to replace a plugin.
   *
   * @example
   * ```typescript
   * manager.registerPlugin({
   *   metadata: {
   *     name: 'my-plugin',
   *     version: '1.0.0',
   *     description: 'My custom plugin',
   *     author: 'Me',
   *     main: 'index.js',
   *     hooks: ['transformContent']
   *   },
   *   instance: myPluginInstance
   * });
   * ```
   */
  public registerPlugin(plugin: Plugin): void {
    if (this.plugins.has(plugin.metadata.name)) {
      this.logger.warn(`Plugin ${plugin.metadata.name} is already registered`);
      return;
    }

    this.plugins.set(plugin.metadata.name, plugin);
    this.logger.debug(`Registered plugin: ${plugin.metadata.name}`);
    this.emit("pluginLoaded", plugin);
  }

  /**
   * Execute a hook across all registered plugins.
   *
   * @description
   * Executes the specified hook on all plugins that implement it.
   * Results are chained - each plugin receives the output of the previous one.
   *
   * @param hook - The hook point to execute
   * @param args - Arguments to pass to the hook (first arg is chained)
   * @returns The final result after all plugins have processed it
   *
   * @remarks
   * - Plugins are executed in registration order
   * - If a plugin returns `undefined`, the previous value is preserved
   * - Errors in one plugin don't stop execution of other plugins
   * - Both sync and async hooks are supported
   *
   * @example
   * ```typescript
   * // Execute PRE_FETCH hook
   * const modifiedConfig = await manager.executeHook(
   *   HookPoint.PRE_FETCH,
   *   config
   * );
   *
   * // Execute TRANSFORM_CONTENT hook with multiple args
   * const transformedContent = await manager.executeHook(
   *   HookPoint.TRANSFORM_CONTENT,
   *   content,
   *   file,
   *   config
   * );
   * ```
   */
  public async executeHook(
    hook: HookPoint,
    ...args: unknown[]
  ): Promise<unknown> {
    this.logger.debug(`Executing hook: ${hook}`);

    let result = args[0]; // Start with the initial value (this gets chained)

    for (const [name, plugin] of this.plugins.entries()) {
      // Check if plugin declares this hook and has the implementation
      if (
        plugin.metadata.hooks.includes(hook) &&
        typeof plugin.instance[hook] === "function"
      ) {
        try {
          this.logger.debug(`Executing ${hook} in plugin ${name}`);

          // Pass the current result as first arg, followed by remaining args
          const hookResult = await plugin.instance[hook](
            result,
            ...args.slice(1),
          );

          // Update result if the hook returned something
          if (hookResult !== undefined) {
            result = hookResult;
          }
        } catch (error) {
          this.logger.error(
            `Error executing hook ${hook} in plugin ${name}:`,
            error,
          );
          // Continue to next plugin - don't let one plugin break the pipeline
        }
      }
    }

    this.emit("hookExecuted", hook, result);
    return result;
  }

  /**
   * Get all registered plugins.
   *
   * @returns Map of plugin name to Plugin object
   *
   * @example
   * ```typescript
   * const plugins = manager.getPlugins();
   * for (const [name, plugin] of plugins) {
   *   console.log(`${name}: ${plugin.metadata.description}`);
   * }
   * ```
   */
  public getPlugins(): Map<string, Plugin> {
    return this.plugins;
  }

  /**
   * Get a specific plugin by name.
   *
   * @param name - Plugin name (from package.json)
   * @returns The plugin if found, undefined otherwise
   *
   * @example
   * ```typescript
   * const highlighter = manager.getPlugin('repo2pdf-plugin-syntax-highlighter');
   * if (highlighter) {
   *   console.log(`Using highlighter v${highlighter.metadata.version}`);
   * }
   * ```
   */
  public getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Unregister a plugin by name.
   *
   * @param name - Plugin name to unregister
   * @returns `true` if the plugin was found and removed, `false` otherwise
   *
   * @example
   * ```typescript
   * // Disable a plugin
   * if (manager.unregisterPlugin('repo2pdf-plugin-syntax-highlighter')) {
   *   console.log('Syntax highlighter disabled');
   * }
   * ```
   */
  public unregisterPlugin(name: string): boolean {
    const removed = this.plugins.delete(name);
    if (removed) {
      this.logger.debug(`Unregistered plugin: ${name}`);
    }
    return removed;
  }

  /**
   * Check if a specific hook has any plugins registered.
   *
   * @param hook - Hook point to check
   * @returns `true` if at least one plugin implements this hook
   *
   * @example
   * ```typescript
   * if (manager.hasHookHandlers(HookPoint.CUSTOM_FETCHER)) {
   *   // Use custom fetcher instead of default
   *   files = await manager.executeHook(HookPoint.CUSTOM_FETCHER, config);
   * } else {
   *   // Use default fetcher
   *   files = await defaultFetcher.fetch(config);
   * }
   * ```
   */
  public hasHookHandlers(hook: HookPoint): boolean {
    for (const plugin of this.plugins.values()) {
      if (
        plugin.metadata.hooks.includes(hook) &&
        typeof plugin.instance[hook] === "function"
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get list of plugins that implement a specific hook.
   *
   * @param hook - Hook point to query
   * @returns Array of plugin names that implement this hook
   *
   * @example
   * ```typescript
   * const transformers = manager.getHookHandlers(HookPoint.TRANSFORM_CONTENT);
   * console.log(`Content transformers: ${transformers.join(', ')}`);
   * ```
   */
  public getHookHandlers(hook: HookPoint): string[] {
    const handlers: string[] = [];
    for (const [name, plugin] of this.plugins.entries()) {
      if (
        plugin.metadata.hooks.includes(hook) &&
        typeof plugin.instance[hook] === "function"
      ) {
        handlers.push(name);
      }
    }
    return handlers;
  }
}
