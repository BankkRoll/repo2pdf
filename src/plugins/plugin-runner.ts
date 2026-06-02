/**
 * Plugin runner abstraction.
 * @module plugins/plugin-runner
 *
 * @description
 * A minimal interface the pipeline components depend on to fire hooks, plus a
 * no-op implementation. This lets processors and the generator accept an
 * optional plugin runner without hard-coupling to the full {@link PluginManager}
 * — and means components constructed directly (in tests or programmatic use)
 * keep working with zero plugin overhead.
 */

import { HookPoint } from "./plugin-manager";

/**
 * The subset of {@link PluginManager} the pipeline needs. `PluginManager`
 * structurally satisfies this, so it can be passed anywhere a `PluginRunner`
 * is expected.
 */
export interface PluginRunner {
  /** Execute a hook, chaining the first argument through all plugins. */
  executeHook(hook: HookPoint, ...args: unknown[]): Promise<unknown>;
  /** Whether any registered plugin implements the given hook. */
  hasHookHandlers(hook: HookPoint): boolean;
}

/**
 * A plugin runner that does nothing — every hook returns the input unchanged
 * and no hooks are ever reported as handled. Used as the default so the
 * pipeline behaves identically when no plugin system is wired in.
 */
export const noopPluginRunner: PluginRunner = {
  async executeHook(_hook: HookPoint, ...args: unknown[]): Promise<unknown> {
    return args[0];
  },
  hasHookHandlers(_hook: HookPoint): boolean {
    return false;
  },
};
