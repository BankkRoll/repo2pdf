import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  HookPoint,
  PluginManager,
  type Plugin,
} from "../src/plugins/plugin-manager";
import { noopPluginRunner } from "../src/plugins/plugin-runner";
import { Logger } from "../src/utils/logger";
import { FileProcessor } from "../src/processors/file-processor";
import { CodeProcessor } from "../src/processors/code-processor";
import {
  createTestConfig,
  createMockRepoFile,
} from "./helpers/test-utils";

/**
 * A Logger that swallows output so the plugin error-isolation tests (which
 * intentionally throw) don't spam the test reporter.
 */
function silentLogger(): Logger {
  const logger = new Logger();
  vi.spyOn(logger, "info").mockImplementation(() => {});
  vi.spyOn(logger, "warn").mockImplementation(() => {});
  vi.spyOn(logger, "error").mockImplementation(() => {});
  vi.spyOn(logger, "debug").mockImplementation(() => {});
  return logger;
}

/**
 * Build a Plugin object in the PluginManager's expected shape. `hooks` is the
 * declared metadata list; `instance` holds the actual hook implementations.
 */
function makePlugin(
  name: string,
  hooks: string[],
  instance: Record<string, unknown>,
): Plugin {
  return {
    metadata: {
      name,
      version: "1.0.0",
      description: `test plugin ${name}`,
      author: "test",
      main: "index.js",
      hooks,
    },
    instance,
  };
}

function newManager(): PluginManager {
  return new PluginManager(silentLogger());
}

describe("PluginManager.executeHook chaining", () => {
  it("chains the first arg through plugins in registration order", async () => {
    const manager = newManager();

    manager.registerPlugin(
      makePlugin("a", [HookPoint.TRANSFORM_CONTENT], {
        [HookPoint.TRANSFORM_CONTENT]: (content: string) => content + "-a",
      }),
    );
    manager.registerPlugin(
      makePlugin("b", [HookPoint.TRANSFORM_CONTENT], {
        [HookPoint.TRANSFORM_CONTENT]: (content: string) => content + "-b",
      }),
    );

    const result = await manager.executeHook(
      HookPoint.TRANSFORM_CONTENT,
      "start",
    );

    // Registration order a -> b means "start-a-b".
    expect(result).toBe("start-a-b");
  });

  it("preserves the previous value when a plugin returns undefined", async () => {
    const manager = newManager();

    manager.registerPlugin(
      makePlugin("upper", [HookPoint.TRANSFORM_CONTENT], {
        [HookPoint.TRANSFORM_CONTENT]: (content: string) =>
          content.toUpperCase(),
      }),
    );
    // This plugin observes but returns undefined -> previous value preserved.
    const observer = vi.fn(() => undefined);
    manager.registerPlugin(
      makePlugin("observer", [HookPoint.TRANSFORM_CONTENT], {
        [HookPoint.TRANSFORM_CONTENT]: observer,
      }),
    );
    manager.registerPlugin(
      makePlugin("suffix", [HookPoint.TRANSFORM_CONTENT], {
        [HookPoint.TRANSFORM_CONTENT]: (content: string) => content + "!",
      }),
    );

    const result = await manager.executeHook(
      HookPoint.TRANSFORM_CONTENT,
      "hello",
    );

    // upper -> "HELLO", observer returns undefined (keeps "HELLO"), suffix -> "HELLO!"
    // executeHook was called with only the chained value, so no extra args.
    expect(observer).toHaveBeenCalledWith("HELLO");
    expect(result).toBe("HELLO!");
  });

  it("passes additional (non-chained) args through to the hook", async () => {
    const manager = newManager();
    const spy = vi.fn((content: string) => content);

    manager.registerPlugin(
      makePlugin("inspect", [HookPoint.FILTER_FILE], {
        [HookPoint.FILTER_FILE]: spy,
      }),
    );

    const file = createMockRepoFile();
    const config = createTestConfig();
    await manager.executeHook(HookPoint.FILTER_FILE, file, config);

    expect(spy).toHaveBeenCalledWith(file, config);
  });
});

describe("PluginManager hook gating (metadata.hooks)", () => {
  it("skips a plugin that implements the fn but does not declare the hook", async () => {
    const manager = newManager();
    const implemented = vi.fn((content: string) => content + "-changed");

    // Declares NO hooks even though instance has the function.
    manager.registerPlugin(
      makePlugin("undeclared", [], {
        [HookPoint.TRANSFORM_CONTENT]: implemented,
      }),
    );

    const result = await manager.executeHook(
      HookPoint.TRANSFORM_CONTENT,
      "input",
    );

    expect(implemented).not.toHaveBeenCalled();
    expect(result).toBe("input");
  });

  it("skips a plugin that declares the hook but lacks the implementation", async () => {
    const manager = newManager();

    // Declares the hook but instance has no matching function.
    manager.registerPlugin(
      makePlugin("declared-only", [HookPoint.TRANSFORM_CONTENT], {}),
    );

    const result = await manager.executeHook(
      HookPoint.TRANSFORM_CONTENT,
      "input",
    );

    expect(result).toBe("input");
  });

  it("calls a plugin only when it BOTH declares the hook AND implements it", async () => {
    const manager = newManager();
    const fn = vi.fn((content: string) => content + "-ok");

    manager.registerPlugin(
      makePlugin("good", [HookPoint.TRANSFORM_CONTENT], {
        [HookPoint.TRANSFORM_CONTENT]: fn,
      }),
    );

    const result = await manager.executeHook(
      HookPoint.TRANSFORM_CONTENT,
      "input",
    );

    expect(fn).toHaveBeenCalledOnce();
    expect(result).toBe("input-ok");
  });
});

describe("PluginManager error isolation", () => {
  it("isolates a throwing plugin and continues the chain without rejecting", async () => {
    const manager = newManager();

    manager.registerPlugin(
      makePlugin("boom", [HookPoint.TRANSFORM_CONTENT], {
        [HookPoint.TRANSFORM_CONTENT]: () => {
          throw new Error("plugin exploded");
        },
      }),
    );
    manager.registerPlugin(
      makePlugin("survivor", [HookPoint.TRANSFORM_CONTENT], {
        [HookPoint.TRANSFORM_CONTENT]: (content: string) => content + "-safe",
      }),
    );

    // Does not reject; the throwing plugin's value is dropped and chaining
    // continues from the prior value ("input").
    const result = await manager.executeHook(
      HookPoint.TRANSFORM_CONTENT,
      "input",
    );

    expect(result).toBe("input-safe");
  });
});

describe("PluginManager hasHookHandlers / getHookHandlers", () => {
  it("reports handlers correctly based on declaration + implementation", () => {
    const manager = newManager();

    manager.registerPlugin(
      makePlugin("a", [HookPoint.FILTER_FILE], {
        [HookPoint.FILTER_FILE]: () => true,
      }),
    );
    manager.registerPlugin(
      makePlugin("b", [HookPoint.FILTER_FILE, HookPoint.TRANSFORM_CONTENT], {
        [HookPoint.FILTER_FILE]: () => true,
        [HookPoint.TRANSFORM_CONTENT]: (c: string) => c,
      }),
    );
    // Declares but does not implement -> must NOT count.
    manager.registerPlugin(
      makePlugin("c", [HookPoint.PRE_FETCH], {}),
    );

    expect(manager.hasHookHandlers(HookPoint.FILTER_FILE)).toBe(true);
    expect(manager.hasHookHandlers(HookPoint.TRANSFORM_CONTENT)).toBe(true);
    expect(manager.hasHookHandlers(HookPoint.PRE_FETCH)).toBe(false);
    expect(manager.hasHookHandlers(HookPoint.POST_GENERATE)).toBe(false);

    expect(manager.getHookHandlers(HookPoint.FILTER_FILE)).toEqual(["a", "b"]);
    expect(manager.getHookHandlers(HookPoint.TRANSFORM_CONTENT)).toEqual(["b"]);
    expect(manager.getHookHandlers(HookPoint.PRE_FETCH)).toEqual([]);
  });
});

describe("PluginManager.registerPlugin", () => {
  it("ignores duplicate plugin names", () => {
    const manager = newManager();

    manager.registerPlugin(
      makePlugin("dup", [HookPoint.FILTER_FILE], {
        [HookPoint.FILTER_FILE]: () => true,
      }),
    );
    manager.registerPlugin(
      makePlugin("dup", [HookPoint.FILTER_FILE], {
        [HookPoint.FILTER_FILE]: () => false,
      }),
    );

    expect(manager.getPlugins().size).toBe(1);
  });
});

describe("INTEGRATION: FileProcessor + FILTER_FILE plugin", () => {
  it("excludes files rejected by a FILTER_FILE plugin", async () => {
    const manager = newManager();

    // Plugin returns false for *.test.ts files to exclude them.
    manager.registerPlugin(
      makePlugin("no-tests", [HookPoint.FILTER_FILE], {
        [HookPoint.FILTER_FILE]: (file: { path: string }) =>
          file.path.endsWith(".test.ts") ? false : true,
      }),
    );

    const config = createTestConfig({
      processing: {
        ignorePatterns: [],
        maxConcurrency: 5,
        removeComments: false,
        removeEmptyLines: false,
        includeBinaryFiles: false,
        includeHiddenFiles: false,
        timeout: 300000,
        useIncrementalProcessing: false,
        incrementalChunkSize: 100,
      },
    });

    const processor = new FileProcessor(config, manager);

    const files = [
      createMockRepoFile({
        name: "index.ts",
        path: "src/index.ts",
        content: "export const a = 1;",
      }),
      createMockRepoFile({
        name: "index.test.ts",
        path: "src/index.test.ts",
        content: "export const b = 2;",
      }),
      createMockRepoFile({
        name: "util.ts",
        path: "src/util.ts",
        content: "export const c = 3;",
      }),
    ];

    const processed = await processor.processFiles(files);
    const paths = processed.map((f) => f.path);

    expect(paths).toContain("src/index.ts");
    expect(paths).toContain("src/util.ts");
    expect(paths).not.toContain("src/index.test.ts");
    expect(processed).toHaveLength(2);
  });

  it("keeps all files when no FILTER_FILE handler is registered", async () => {
    const manager = newManager();
    const config = createTestConfig();
    const processor = new FileProcessor(config, manager);

    const files = [
      createMockRepoFile({ path: "src/a.ts", content: "const a = 1;" }),
      createMockRepoFile({ path: "src/b.test.ts", content: "const b = 2;" }),
    ];

    const processed = await processor.processFiles(files);
    expect(processed).toHaveLength(2);
  });
});

describe("INTEGRATION: CodeProcessor + TRANSFORM_CONTENT plugin", () => {
  it("applies a TRANSFORM_CONTENT plugin to processedContent", async () => {
    const manager = newManager();

    manager.registerPlugin(
      makePlugin("uppercase", [HookPoint.TRANSFORM_CONTENT], {
        [HookPoint.TRANSFORM_CONTENT]: (content: string) =>
          content.toUpperCase(),
      }),
    );

    const config = createTestConfig();
    const processor = new CodeProcessor(config, manager);

    const file = createMockRepoFile({
      path: "src/hello.ts",
      content: "const greeting = 'hello';",
      language: "typescript",
    });

    const result = await processor.process(file);

    expect(result.processedContent).toBe("CONST GREETING = 'HELLO';");
  });

  it("leaves content unchanged when no TRANSFORM_CONTENT handler is registered", async () => {
    const manager = newManager();
    const config = createTestConfig();
    const processor = new CodeProcessor(config, manager);

    const original = "const x = 1;";
    const file = createMockRepoFile({
      path: "src/x.ts",
      content: original,
      language: "typescript",
    });

    const result = await processor.process(file);
    expect(result.processedContent).toBe(original);
  });
});

describe("noopPluginRunner", () => {
  it("executeHook returns the first arg unchanged", async () => {
    const value = { foo: "bar" };
    const result = await noopPluginRunner.executeHook(
      HookPoint.TRANSFORM_CONTENT,
      value,
      "extra",
    );
    expect(result).toBe(value);
  });

  it("hasHookHandlers is always false", () => {
    for (const hook of Object.values(HookPoint)) {
      expect(noopPluginRunner.hasHookHandlers(hook as HookPoint)).toBe(false);
    }
  });
});
